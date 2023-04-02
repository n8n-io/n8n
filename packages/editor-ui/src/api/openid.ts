import { IOpenIDConfig, IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import { IDataObject } from 'n8n-workflow';

export function getOpenIDConfig(context: IRestApiContext): Promise<IOpenIDConfig> {
	return makeRestApiRequest(context, 'GET', '/openid/config');
}

export function updateOpenIDConfig(
	context: IRestApiContext,
	openidConfig: IOpenIDConfig,
): Promise<IOpenIDConfig> {
	return makeRestApiRequest(
		context,
		'PUT',
		'/openid/config',
		openidConfig as unknown as IDataObject,
	);
}
