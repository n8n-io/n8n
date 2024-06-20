import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IRestApiContext, UsageState } from '@/Interface';

export const getLicense = async (context: IRestApiContext): Promise<UsageState['data']> => {
	return await makeRestApiRequest(context, 'GET', '/license');
};

export const activateLicenseKey = async (
	context: IRestApiContext,
	data: { activationKey: string },
): Promise<UsageState['data']> => {
	return await makeRestApiRequest(context, 'POST', '/license/activate', data);
};

export const renewLicense = async (context: IRestApiContext): Promise<UsageState['data']> => {
	return await makeRestApiRequest(context, 'POST', '/license/renew');
};

export const requestLicenseTrial = async (
	context: IRestApiContext,
): Promise<UsageState['data']> => {
	return await makeRestApiRequest(context, 'POST', '/license/enterprise/request_trial');
};
