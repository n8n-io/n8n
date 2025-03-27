import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { detailReport } from '../endpoints/exclusives/report/detailReport';
import { createReport } from '../endpoints/exclusives/report/createReport';
import { medList } from '../endpoints/exclusives/med/medList';
import { pixListEvp } from '../endpoints/exclusives/key/pixListEvp';
import { pixDeleteEvp } from '../endpoints/exclusives/key/pixDeleteEvp';
import { pixCreateEvp } from '../endpoints/exclusives/key/pixCreateEvp';
import { updateAccountConfig } from '../endpoints/exclusives/account/updateAccountConfig';
import { listAccountConfig } from '../endpoints/exclusives/account/listAccountConfig';
import { getAccountBalance } from '../endpoints/exclusives/account/getAccountBalance';

export async function exclusivesService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;
  switch (endpoint) {
    case 'getAccountBalance':
      requestOptions = await getAccountBalance(this, i);
    break;

    case 'listAccountConfig':
      requestOptions = await listAccountConfig(this, i);
    break;

    case 'updateAccountConfig':
      requestOptions = await updateAccountConfig(this, i);
    break;

    case 'pixCreateEvp':
      requestOptions = await pixCreateEvp(this, i);
    break;
    
    case 'pixDeleteEvp':
      requestOptions = await pixDeleteEvp(this, i);
    break;

    case 'pixListEvp':
      requestOptions = await pixListEvp(this, i);
    break;

    case 'medList':
      requestOptions = await medList(this, i);
    break;
    
    case 'createReport':
      requestOptions = await createReport(this, i);
    break;

    case 'detailReport':
      requestOptions = await detailReport(this, i);
    break;

            default:
                throw new Error(`Endpoint exclusivo Efí não implementado`);
  }

  return requestOptions;
}
