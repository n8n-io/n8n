import {
	ActivateLicensePayload,
	LicenseResponse,
	IRestApiContext,
} from '@/Interface';
import { makeRestApiRequest } from './helpers';
import {
	IDataObject,
} from 'n8n-workflow';

export async function activateLicense(context: IRestApiContext, data: ActivateLicensePayload): Promise<LicenseResponse> {
	return makeRestApiRequest(context, 'POST', `/license/activate`, data as unknown as IDataObject);
}

export async function renewLicense(context: IRestApiContext): Promise<LicenseResponse> {
	return makeRestApiRequest(context, 'POST', `/license/renew`);
}

