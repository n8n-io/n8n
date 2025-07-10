import type { ExternalSecretsProvider } from '@/Interface';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export const getExternalSecrets = async (
	context: IRestApiContext,
): Promise<Record<string, string[]>> => {
	return await makeRestApiRequest(context, 'GET', '/external-secrets/secrets');
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
