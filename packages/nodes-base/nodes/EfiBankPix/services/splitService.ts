import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { pixSplitConfig } from '../endpoints/split/config/pixSplitConfig';
import { pixSplitConfigId } from '../endpoints/split/config/pixSplitConfigId';
import { pixSplitDetailConfig } from '../endpoints/split/config/pixSplitDetailConfig';
import { pixCreateCharge } from '../endpoints/cob/pixCreateCharge';
import { pixSplitLinkCharge } from '../endpoints/split/cob/pixSplitLinkCharge';
import { pixSplitUnlinkDueCharge } from '../endpoints/split/cobv/pixSplitUnlinkDueCharge';
import { pixSplitLinkDueCharge } from '../endpoints/split/cobv/pixSplitLinkDueCharge';
import { pixSplitDetailDueCharge } from '../endpoints/split/cobv/pixSplitDetailDueCharge';
import { pixSplitUnlinkCharge } from '../endpoints/split/cob/pixSplitUnlinkCharge';
import { pixSplitDetailCharge } from '../endpoints/split/cob/pixSplitDetailCharge';
import { pixCreateDueCharge } from '../endpoints/cobv/pixCreateDueCharge';

export async function splitService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;
  switch (endpoint) {
    case 'pixSplitConfig':
      requestOptions = await pixSplitConfig(this, i);
    break;
    case 'pixSplitConfigId':
      requestOptions = await pixSplitConfigId(this, i);
    break;
    case 'pixSplitDetailConfig':
      requestOptions = await pixSplitDetailConfig(this, i);
    break;
    case 'pixCreateCharge':
      requestOptions = await pixCreateCharge(this, i);
    break;
    case 'pixSplitDetailCharge':
      requestOptions = await pixSplitDetailCharge(this, i);
    break;
    case 'pixCreateDueCharge':
      requestOptions = await pixCreateDueCharge(this, i);
    break;
    case 'pixSplitLinkCharge':
      requestOptions = await pixSplitLinkCharge(this, i);
    break;
    case 'pixSplitUnlinkCharge':
      requestOptions = await pixSplitUnlinkCharge(this, i);
    break;
    case 'pixSplitDetailDueCharge':
      requestOptions = await pixSplitDetailDueCharge(this, i);
    break;
    case 'pixSplitLinkDueCharge':
      requestOptions = await pixSplitLinkDueCharge(this, i);
    break;  
    case 'pixSplitUnlinkDueCharge':
      requestOptions = await pixSplitUnlinkDueCharge(this, i);
    break;

    default:
      throw new Error(`Endpoint de split de pagamento não implementado`);
  }

  return requestOptions;
}
