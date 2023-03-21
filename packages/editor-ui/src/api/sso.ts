import { makeRestApiRequest } from '@/utils';
import { IRestApiContext } from '@/Interface';

export const initSSO = (context: IRestApiContext): Promise<string> => {
	return makeRestApiRequest(context, 'GET', '/sso/saml/initsso');
};
