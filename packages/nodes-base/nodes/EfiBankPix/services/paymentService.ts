import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { pixSend } from '../endpoints/payment/pixSend';
import { pixSendDetail } from '../endpoints/payment/pixSendDetail';
import { pixSendDetailId } from '../endpoints/payment/pixSendDetailId';
import { pixSendList } from '../endpoints/payment/pixSendList';
import { pixQrCodeDetail } from '../endpoints/payment/pixQrCodeDetail';
import { pixQrCodePay } from '../endpoints/payment/pixQrCodePay';

export async function paymentService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;
  switch (endpoint) {
    case 'pixSend':
      requestOptions = await pixSend(this, i);
      break;
    case 'pixSendDetail':
      requestOptions = await pixSendDetail(this, i);
      break;
    case 'pixSendDetailId':
      requestOptions = await pixSendDetailId(this, i);
      break; 
    case 'pixSendList':
      requestOptions = await pixSendList(this, i);
      break;
    case 'pixQrCodeDetail':
      requestOptions = await pixQrCodeDetail(this, i);
      break;
    case 'pixQrCodePay':
      requestOptions = await pixQrCodePay(this, i);
      break;   

    default:
        throw new Error(`Endpoint de envio e pagamento não implementado`);
  }

  return requestOptions;
}
