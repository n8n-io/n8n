import type {
	IRestApiContext,
	ExternalSecretsProvider,
	ExternalSecretsProviderWithProperties,
} from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export const getExternalSecrets = async (
	context: IRestApiContext,
): Promise<Record<string, string[]>> => {
	return makeRestApiRequest(context, 'GET', '/external-secrets/secrets');
};

export const getExternalSecretsProviders = async (
	context: IRestApiContext,
): Promise<ExternalSecretsProvider[]> => {
	return makeRestApiRequest(context, 'GET', '/external-secrets/providers');
};

export const getExternalSecretsProvider = async (
	context: IRestApiContext,
	id: string,
): Promise<ExternalSecretsProviderWithProperties> => {
	return makeRestApiRequest(context, 'GET', `/external-secrets/providers/${id}`);
};

export const testExternalSecretsProviderConnection = async (
	context: IRestApiContext,
	id: string,
	data: ExternalSecretsProvider['data'],
): Promise<{ testState: ExternalSecretsProvider['state'] }> => {
	return makeRestApiRequest(context, 'POST', `/external-secrets/providers/${id}/test`, data);
};

export const updateProvider = async (
	context: IRestApiContext,
	id: string,
	data: ExternalSecretsProvider['data'],
): Promise<boolean> => {
	return makeRestApiRequest(context, 'POST', `/external-secrets/providers/${id}`, data);
};

export const reloadProvider = async (
	context: IRestApiContext,
	id: string,
): Promise<{ updated: boolean }> => {
	return makeRestApiRequest(context, 'POST', `/external-secrets/providers/${id}/update`);
};

export const connectProvider = async (
	context: IRestApiContext,
	id: string,
	connected: boolean,
): Promise<boolean> => {
	return makeRestApiRequest(context, 'POST', `/external-secrets/providers/${id}/connect`, {
		connected,
	});
};
