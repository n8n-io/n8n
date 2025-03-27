import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { pixDetailReceived } from '../endpoints/management/pixDetailReceived';
import { pixReceivedList } from '../endpoints/management/pixReceivedList';
import { pixDevolution } from '../endpoints/management/pixDevolution';
import { pixDetailDevolution } from '../endpoints/management/pixDetailDevolution';

export async function managementService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;
  switch (endpoint) {
    case 'pixDetailReceived':
      requestOptions = await pixDetailReceived(this, i);
      break;
    case 'pixReceivedList':
      requestOptions = await pixReceivedList(this, i);
      break;
    case 'pixDevolution':
      requestOptions = await pixDevolution(this, i);
      break;
    case 'pixDetailDevolution':
      requestOptions = await pixDetailDevolution(this, i);
      break;

    default:
        throw new Error(`Endpoint de gestão de pix não implementado`);
  }

  return requestOptions;
}
