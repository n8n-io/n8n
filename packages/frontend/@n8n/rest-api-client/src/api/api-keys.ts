import type {
	CreateApiKeyRequestDto,
	UpdateApiKeyRequestDto,
	ApiKey,
	ApiKeyWithRawValue,
} from '@n8n/api-types';
import type { ApiKeyScope } from '@n8n/permissions';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getApiKeys(context: IRestApiContext): Promise<ApiKey[]> {
	return await makeRestApiRequest(context, 'GET', '/api-keys');
}

export async function getApiKeyScopes(context: IRestApiContext): Promise<ApiKeyScope[]> {
	return await makeRestApiRequest(context, 'GET', '/api-keys/scopes');
}

export async function createApiKey(
	context: IRestApiContext,
	payload: CreateApiKeyRequestDto,
): Promise<ApiKeyWithRawValue> {
	return await makeRestApiRequest(context, 'POST', '/api-keys', payload);
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
	payload: UpdateApiKeyRequestDto,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'PATCH', `/api-keys/${id}`, payload);
}
