import type { ExternalSecretsProvider } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export const getExternalSecrets = async (
	context: IRestApiContext,
): Promise<Record<string, string[]>> => {
	return await makeRestApiRequest(context, 'GET', '/external-secrets/secrets');
};

/**
 * @beta still under development
 */
export const getGlobalExternalSecrets = async (
	context: IRestApiContext,
): Promise<Record<string, string[]>> => {
	return await makeRestApiRequest(context, 'GET', '/secret-providers/completions/secrets/global');
};

/**
 * @beta still under development
 */
export const getProjectExternalSecrets = async (
	context: IRestApiContext,
	projectId: string,
): Promise<Record<string, string[]>> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`/secret-providers/completions/secrets/project/${projectId}`,
	);
};

export const getExternalSecretsProviders = async (
	context: IRestApiContext,
): Promise<ExternalSecretsProvider[]> => {
	return await makeRestApiRequest(context, 'GET', '/external-secrets/providers');
};

export const getExternalSecretsProvider = async (
	context: IRestApiContext,
	id: string,
): Promise<ExternalSecretsProvider> => {
	return await makeRestApiRequest(context, 'GET', `/external-secrets/providers/${id}`);
};

export const testExternalSecretsProviderConnection = async (
	context: IRestApiContext,
	id: string,
	data: ExternalSecretsProvider['data'],
): Promise<{ testState: ExternalSecretsProvider['state'] }> => {
	return await makeRestApiRequest(context, 'POST', `/external-secrets/providers/${id}/test`, data);
};

export const updateProvider = async (
	context: IRestApiContext,
	id: string,
	data: ExternalSecretsProvider['data'],
): Promise<boolean> => {
	return await makeRestApiRequest(context, 'POST', `/external-secrets/providers/${id}`, data);
};

export const reloadProvider = async (
	context: IRestApiContext,
	id: string,
): Promise<{ updated: boolean }> => {
	return await makeRestApiRequest(context, 'POST', `/external-secrets/providers/${id}/update`);
};

export const connectProvider = async (
	context: IRestApiContext,
	id: string,
	connected: boolean,
): Promise<boolean> => {
	return await makeRestApiRequest(context, 'POST', `/external-secrets/providers/${id}/connect`, {
		connected,
	});
};
