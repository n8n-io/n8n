import { makeRestApiRequest } from '@/utils';
import { IRestApiContext, UsageState } from '@/Interface';

export const getLicense = (context: IRestApiContext): Promise<UsageState['data']> => {
	return makeRestApiRequest(context, 'GET', '/license');
};

export const activateLicenseKey = (
	context: IRestApiContext,
	data: { activationKey: string },
): Promise<UsageState['data']> => {
	return makeRestApiRequest(context, 'POST', '/license/activate', data);
};

export const renewLicense = (context: IRestApiContext): Promise<UsageState['data']> => {
	return makeRestApiRequest(context, 'POST', '/license/renew');
};
