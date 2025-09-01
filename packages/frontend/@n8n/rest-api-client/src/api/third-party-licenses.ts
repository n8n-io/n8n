import type { IRestApiContext } from '../types';
import { request } from '../utils';

export async function getThirdPartyLicenses(context: IRestApiContext): Promise<string> {
	return await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: '/third-party-licenses',
	});
}
