import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IRestApiContext, UsageState } from '@/Interface';

export const getLicense = async (context: IRestApiContext): Promise<UsageState['data']> => {
	return makeRestApiRequest(context, 'GET', '/license');
};

export const activateLicenseKey = async (
	context: IRestApiContext,
	data: { activationKey: string },
): Promise<UsageState['data']> => {
	return makeRestApiRequest(context, 'POST', '/license/activate', data);
};

export const renewLicense = async (context: IRestApiContext): Promise<UsageState['data']> => {
	return makeRestApiRequest(context, 'POST', '/license/renew');
};

export const requestLicenseTrial = async (
	context: IRestApiContext,
	data: {
		licenseType: 'enterprise';
		firstName: string;
		lastName: string;
		email: string;
		instanceUrl: string;
	},
): Promise<UsageState['data']> => {
	return makeRestApiRequest(
		{ ...context, baseUrl: 'https://enterprise.n8n-maintenance.workers.dev' },
		'POST',
		'/enterprise-trial',
		data,
	);
};
