import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { pixCreateLocation } from '../endpoints/location/pixCreateLocation'; 
import { pixLocationList } from '../endpoints/location/pixLocationList';
import { pixDetailLocation } from '../endpoints/location/pixDetailLocation';
import { pixGenerateQRCode } from '../endpoints/location/pixGenerateQRCode';
import { pixUnlinkTxidLocation } from '../endpoints/location/pixUnlinkTxidLocation';

export async function locationService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;
  switch (endpoint) {
    case 'pixCreateLocation':
      requestOptions = await pixCreateLocation(this, i);
      break;
    case 'pixLocationList':
      requestOptions = await pixLocationList(this, i);
      break;
    case 'pixDetailLocation':
      requestOptions = await pixDetailLocation(this, i);
      break;
    case 'pixGenerateQRCode':
      requestOptions = await pixGenerateQRCode(this, i);
      break;
    case 'pixUnlinkTxidLocation':
      requestOptions = await pixUnlinkTxidLocation(this, i);
      break;

    default:
        throw new Error(`Endpoint de location não implementado`);
  }

  return requestOptions;
}
