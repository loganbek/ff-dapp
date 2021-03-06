import {Injectable} from '@angular/core';
import { Subject } from 'rxjs';
declare let require: any;
const Web3 = require('web3');
//const contract = require('@truffle/contract');
import { DebugService } from './debug.service';
import Notify from 'bnc-notify';
import Onboard from 'bnc-onboard'
import { environment } from 'src/environments/environment';
import { WalletState } from '../models/walletState';
import { Transaction } from '../models/tx';

//declare let window: any;

@Injectable()
export class Web3Service {
  private web3: any;
  private onboard: any;
  public currentWalletState$ = new Subject<WalletState>();
  public tx$ = new Subject<any>();

  //Block Native ONBOARD options
  initializationOptions = {
    dappId: environment.BLOCK_NATIVE_KEY,
    networkId: 5,
    darkMode: true,
    subscriptions: {
        wallet: wallet => {
            this.web3 = new Web3(wallet.provider)
        },
        balance: () => {}
    },
    walletSelect: {
        heading: "Donation Prep",
        wallets: [
            { walletName: 'metamask' },
            { walletName: 'opera' }
        ]
    },
    walletCheck: [
        { checkName: 'connect' },
        { checkName: 'network' },
        { checkName: 'balance', minimumBalance: '100000' }
    ]
  }

  constructor(private debugService: DebugService) {
    this.blockNativeOnboard(this.initializationOptions);
  }

//   public async artifactsToContract(artifacts) {
//     if (!this.web3) {
//         const delay = new Promise(resolve => setTimeout(resolve, 1000));
//         await delay;
//         return await this.artifactsToContract(artifacts);
//     }

//     const contractAbstraction = contract(artifacts);
//     contractAbstraction.setProvider(this.web3.currentProvider);
//     this.log('artifactsToContract called');
//     return contractAbstraction;
//   }

  private async blockNativeOnboard(options) {
    this.onboard = Onboard(options);
    let walletSelected: boolean, readyToTransact: boolean;
    try {
        walletSelected = await this.onboard.walletSelect();
    } catch (error) {
        console.log(error);
    }
    if (walletSelected) {
        readyToTransact = await this.onboard.walletCheck();
    }
    if (walletSelected && readyToTransact){
        this.currentWalletState$.next(this.onboard.getState());
    } else {
        this.log('No wallet detected');
    }
  }

  public donate(options) {
      let self = this;
      this.web3.eth.sendTransaction(options).on('transactionHash', function(hash){  
        let notifyInstance = Notify({
            dappId: environment.BLOCK_NATIVE_KEY,
            networkId: 5
        });
        const { emitter } = notifyInstance.hash(hash);
        emitter.on('txConfirmed', function(tx) {
            self.tx$.next(tx);
            setTimeout(() => {
                self.currentWalletState$.next(self.onboard.getState())}, 
                8000
            );
        });
      })
  }

  /** Add 1 because of zero index and return its hex value for msg.data */
  public getHexValue(index: number) {
      let evalId = index + 1;
      return this.web3.utils.toHex(evalId);
  }

  public convertETHToWei(amount: number) {
    return this.web3.utils.toWei(amount, 'ether');
  }

  /** Log a OrgService message with the MessageService */
  private log(message: string) {
    this.debugService.add(`Web3Service: ${message}`);
  }

}