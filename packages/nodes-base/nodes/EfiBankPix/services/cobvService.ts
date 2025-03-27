import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { pixCreateDueCharge } from '../endpoints/cobv/pixCreateDueCharge';
import { pixUpdateDueCharge } from '../endpoints/cobv/pixUpdateDueCharge';
import { pixDetailDueCharge } from '../endpoints/cobv/pixDetailDueCharge';
import { pixListDueCharges } from '../endpoints/cobv/pixListDueCharges';

export async function cobvService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;
  switch (endpoint) {
     case 'pixCreateDueCharge':
       requestOptions = await pixCreateDueCharge(this, i);
       break;
     case 'pixUpdateDueCharge':
       requestOptions = await pixUpdateDueCharge(this, i);
       break;
     case 'pixDetailDueCharge':
       requestOptions = await pixDetailDueCharge(this, i);
       break;
     case 'pixListDueCharges':
       requestOptions = await pixListDueCharges(this, i);
       break;
      default:
        throw new Error(`Endpoint de cobrança com vencimento não implementado`);
   }

  return requestOptions;
}
