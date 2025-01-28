import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { CreateOrUpdateApiKeyRequestDto, ApiKey, ApiKeyWithRawValue } from '@n8n/api-types';

export async function getApiKeys(context: IRestApiContext): Promise<ApiKey[]> {
	return await makeRestApiRequest(context, 'GET', '/api-keys');
}

export async function createApiKey(
	context: IRestApiContext,
	{ label }: CreateOrUpdateApiKeyRequestDto,
): Promise<ApiKeyWithRawValue> {
	return await makeRestApiRequest(context, 'POST', '/api-keys', { label });
}

export async function deleteApiKey(
	context: IRestApiContext,
	id: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', `/api-keys/${id}`);
}

export async function updateApiKey(
	context: IRestApiContext,
	id: string,
	{ label }: CreateOrUpdateApiKeyRequestDto,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'PATCH', `/api-keys/${id}`, { label });
}
