import type {
	ReloadSecretProviderConnectionResponse,
	SecretProviderConnection,
	SecretProviderTypeResponse,
	TestSecretProviderConnectionResponse,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export const getSecretProviderTypes = async (
	context: IRestApiContext,
): Promise<SecretProviderTypeResponse[]> => {
	return await makeRestApiRequest(context, 'GET', '/secret-providers/types');
};

export const getSecretProviderConnections = async (
	context: IRestApiContext,
): Promise<SecretProviderConnection[]> => {
	return await makeRestApiRequest(context, 'GET', '/secret-providers/connections');
};

export const getSecretProviderConnectionByKey = async (
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
	providerKey: string,
): Promise<TestSecretProviderConnectionResponse> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`/secret-providers/connections/${providerKey}/test`,
	);
};

export const reloadSecretProviderConnection = async (
	context: IRestApiContext,
	providerKey: string,
): Promise<ReloadSecretProviderConnectionResponse> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`/secret-providers/connections/${providerKey}/reload`,
	);
};

export const deleteSecretProviderConnection = async (
	context: IRestApiContext,
	providerKey: string,
): Promise<void> => {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`/secret-providers/connections/${providerKey}`,
	);
};

export const getProjectSecretProviderConnectionsByProjectId = async (
	context: IRestApiContext,
	projectId: string,
): Promise<SecretProviderConnection[]> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`/secret-providers/projects/${projectId}/connections`,
	);
};
