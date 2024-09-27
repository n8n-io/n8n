import type { ApiKey, IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function getApiKeys(context: IRestApiContext): Promise<ApiKey[]> {
	return await makeRestApiRequest(context, 'GET', '/me/api-keys');
}

export async function createApiKey(context: IRestApiContext): Promise<ApiKey> {
	return await makeRestApiRequest(context, 'POST', '/me/api-keys');
}

export async function deleteApiKey(
	context: IRestApiContext,
	id: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', `/me/api-keys/${id}`);
}
