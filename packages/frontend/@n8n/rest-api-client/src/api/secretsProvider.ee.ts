import type { SecretProviderConnection, SecretProviderTypeResponse } from '@n8n/api-types';

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
