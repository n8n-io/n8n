import type { ExternalSecretsProvider } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export const getSecretProviderConnections = async (
	context: IRestApiContext,
): Promise<ExternalSecretsProvider[]> => {
	return await makeRestApiRequest(context, 'GET', '/secret-providers/connections');
};
