import type {
	SecretProviderConnection,
	SecretProviderTypeResponse,
	TestSecretProviderConnectionResponse,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export const getSecretProviderTypes = async (
	context: IRestApiContext,
): Promise<SecretProviderTypeResponse[]> => {
	return await makeRestApiRequest(
		context,
		'GET',
		'/secret-providers/secrets-provider-connection-type',
	);
};

export const getSecretProviderConnections = async (
	context: IRestApiContext,
): Promise<SecretProviderConnection[]> => {
	return await makeRestApiRequest(context, 'GET', '/secret-providers/connections');
};

export const getSecretProviderConnectionById = async (
	context: IRestApiContext,
	providerKey: string,
): Promise<SecretProviderConnection> => {
	return await makeRestApiRequest(context, 'GET', `/secret-providers/connections/${providerKey}`);
};

export const createSecretProviderConnection = async (
	context: IRestApiContext,
	data: {
		providerKey: string;
		type: string;
		isGlobal: boolean;
		projectIds: string[];
		settings: Record<string, unknown>;
	},
): Promise<SecretProviderConnection> => {
	return await makeRestApiRequest(context, 'POST', '/secret-providers/connections', data);
};

export const updateSecretProviderConnection = async (
	context: IRestApiContext,
	providerKey: string,
	data: {
		isGlobal: boolean;
		projectIds: string[];
		settings: Record<string, unknown>;
	},
): Promise<SecretProviderConnection> => {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/secret-providers/connections/${providerKey}`,
		data,
	);
};

export const testSecretProviderConnection = async (
	context: IRestApiContext,
	connectionId: string,
): Promise<TestSecretProviderConnectionResponse> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`/secret-providers/connections/${connectionId}/test`,
	);
};
