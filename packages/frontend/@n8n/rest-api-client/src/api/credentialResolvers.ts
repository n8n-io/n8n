import type { CredentialResolver, CredentialResolverType } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getCredentialResolvers(
	context: IRestApiContext,
): Promise<CredentialResolver[]> {
	return await makeRestApiRequest(context, 'GET', '/credential-resolvers');
}

export async function getCredentialResolverTypes(
	context: IRestApiContext,
): Promise<CredentialResolverType[]> {
	return await makeRestApiRequest(context, 'GET', '/credential-resolvers/types');
}

export async function getCredentialResolver(
	context: IRestApiContext,
	resolverId: string,
): Promise<CredentialResolver> {
	return await makeRestApiRequest(context, 'GET', `/credential-resolvers/${resolverId}`);
}

export async function createCredentialResolver(
	context: IRestApiContext,
	payload: { name: string; type: string; config: Record<string, unknown> },
): Promise<CredentialResolver> {
	return await makeRestApiRequest(context, 'POST', '/credential-resolvers', payload);
}

export async function updateCredentialResolver(
	context: IRestApiContext,
	resolverId: string,
	payload: {
		name: string;
		type: string;
		config: Record<string, unknown>;
		clearCredentials?: boolean;
	},
): Promise<CredentialResolver> {
	return await makeRestApiRequest(context, 'PATCH', `/credential-resolvers/${resolverId}`, payload);
}

export async function deleteCredentialResolver(
	context: IRestApiContext,
	resolverId: string,
): Promise<void> {
	return await makeRestApiRequest(context, 'DELETE', `/credential-resolvers/${resolverId}`);
}
