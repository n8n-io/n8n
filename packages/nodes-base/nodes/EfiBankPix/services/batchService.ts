
import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { pixCreateDueChargeBatch } from '../endpoints/batch/pixCreateDueChargeBatch';
import { pixUpdateDueChargeBatch } from '../endpoints/batch/pixUpdateDueChargeBatch';
import { pixDetailDueChargeBatch } from '../endpoints/batch/pixDetailDueChargeBatch';
import { pixListDueChargeBatch } from '../endpoints/batch/pixListDueChargeBatch';

export async function batchService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;
  switch (endpoint) {
    case 'pixCreateDueChargeBatch':
      requestOptions = await pixCreateDueChargeBatch(this, i);
      break;
    case 'pixUpdateDueChargeBatch':
      requestOptions = await pixUpdateDueChargeBatch(this, i);
      break;
    case 'pixDetailDueChargeBatch':
      requestOptions = await pixDetailDueChargeBatch(this, i);
      break;
    case 'pixListDueChargeBatch':
      requestOptions = await pixListDueChargeBatch(this, i);
      break;

    default:
        throw new Error(`Endpoint de cobrança em lote não implementado`);
  }

  return requestOptions;
}
