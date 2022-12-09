import { makeRestApiRequest } from '@/utils';
import { IRestApiContext, UsageState } from '@/Interface';

export const getLicense = (context: IRestApiContext): Promise<{data: UsageState['data']}> => {
	return makeRestApiRequest(context, 'GET', '/license');
};

export const activateLicenseKey = (context: IRestApiContext, data: { activationKey: string }): Promise<{data: UsageState['data']}> => {
	return makeRestApiRequest(context, 'POST', '/license/activate', data);
};

export const renewLicense = (context: IRestApiContext): Promise<{data: UsageState['data']}> => {
	return makeRestApiRequest(context, 'POST', '/license/renew');
};
