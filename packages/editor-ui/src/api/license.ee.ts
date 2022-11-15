import {
	ActivateLicensePayload,
	ActivateLicenseResponse,
	IRestApiContext,
} from '@/Interface';
import { makeRestApiRequest } from './helpers';
import {
	IDataObject,
} from 'n8n-workflow';

export async function activateLicense(context: IRestApiContext, data: ActivateLicensePayload): Promise<ActivateLicenseResponse> {
	return makeRestApiRequest(context, 'POST', `/license/activate`, data as unknown as IDataObject);
}
