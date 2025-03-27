import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { pixConfigWebhook } from '../endpoints/webhooks/pixConfigWebhook';
import { pixDeleteWebhook } from '../endpoints/webhooks/pixDeleteWebhook';
import { pixDetailWebhook } from '../endpoints/webhooks/pixDetailWebhook';
import { pixListWebhook } from '../endpoints/webhooks/pixListWebhook';
import { pixResendWebhook } from '../endpoints/webhooks/pixResendWebhook';

export async function webhooksService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;
  switch (endpoint) {
    case 'pixConfigWebhook':
      requestOptions = await pixConfigWebhook(this, i);
    break;

    case 'pixDeleteWebhook':
        requestOptions = await pixDeleteWebhook(this, i);
    break;
      
    case 'pixDetailWebhook':
      requestOptions = await pixDetailWebhook(this, i);
    break;
        
    case 'pixListWebhook':
      requestOptions = await pixListWebhook(this, i);
    break;
        
    case 'pixResendWebhook':
      requestOptions = await pixResendWebhook(this, i);
    break;

    default:
      throw new Error(`Endpoint de webhook não implementado`);
  }

  return requestOptions;
}
