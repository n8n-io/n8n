import type { ApiKey, IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function getApiKeys(context: IRestApiContext): Promise<ApiKey[]> {
	return await makeRestApiRequest(context, 'GET', '/api-keys');
}

export async function createApiKey(
	context: IRestApiContext,
	{ label }: { label: string },
): Promise<ApiKey> {
	return await makeRestApiRequest(context, 'POST', '/api-keys', { label });
}

export async function deleteApiKey(
	context: IRestApiContext,
	id: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', `/api-keys/${id}`);
}
