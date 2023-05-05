import type { ILdapConfig, ILdapSyncData, IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type { IDataObject } from 'n8n-workflow';

export function getLdapConfig(context: IRestApiContext): Promise<ILdapConfig> {
	return makeRestApiRequest(context, 'GET', '/ldap/config');
}

export function testLdapConnection(context: IRestApiContext): Promise<{}> {
	return makeRestApiRequest(context, 'POST', '/ldap/test-connection');
}

export function updateLdapConfig(
	context: IRestApiContext,
	adConfig: ILdapConfig,
): Promise<ILdapConfig> {
	return makeRestApiRequest(context, 'PUT', '/ldap/config', adConfig as unknown as IDataObject);
}

export function runLdapSync(context: IRestApiContext, data: IDataObject): Promise<{}> {
	return makeRestApiRequest(context, 'POST', '/ldap/sync', data as unknown as IDataObject);
}

export function getLdapSynchronizations(
	context: IRestApiContext,
	pagination: { page: number },
): Promise<ILdapSyncData[]> {
	return makeRestApiRequest(context, 'GET', '/ldap/sync', pagination);
}
