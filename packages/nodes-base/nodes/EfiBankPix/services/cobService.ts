import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { pixCreateImmediateCharge } from '../endpoints/cob/pixCreateImmediateCharge';
import { pixCreateCharge } from '../endpoints/cob/pixCreateCharge';
import { pixUpdateCharge } from '../endpoints/cob/pixUpdateCharge';
import { pixDetailCharge } from '../endpoints/cob/pixDetailCharge';
import { pixListCharges } from '../endpoints/cob/pixListCharges';

export async function cobService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;
  switch (endpoint) {
    case 'pixCreateImmediateCharge':
      requestOptions = await pixCreateImmediateCharge(this, i);
      break;
    case 'pixCreateCharge':
      requestOptions = await pixCreateCharge(this, i);
      break;
    case 'pixUpdateCharge':
      requestOptions = await pixUpdateCharge(this, i);
      break;
    case 'pixDetailCharge':
      requestOptions = await pixDetailCharge(this, i);
      break;
    case 'pixListCharges':
      requestOptions = await pixListCharges(this, i);
      break;
			default:
				throw new Error(`Endpoint de cobrança imediata não implementado`);
  }

  return requestOptions;
}
