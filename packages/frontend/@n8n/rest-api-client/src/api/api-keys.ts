import type {
	ApiKeyOwnership,
	CreateApiKeyRequestDto,
	UpdateApiKeyRequestDto,
	ApiKeyList,
	ApiKeyWithRawValue,
	ListApiKeysSortOption,
} from '@n8n/api-types';
import type { ApiKeyScope } from '@n8n/permissions';

import { createInternalApiClient } from '../generated/internal-api-client';
import type { IRestApiContext } from '../types';

export async function getApiKeys(
	context: IRestApiContext,
	options: {
		take?: number;
		skip?: number;
		ownership?: ApiKeyOwnership;
		label?: string;
		ownerIds?: string[];
		sortBy?: string;
	} = {},
): Promise<ApiKeyList> {
	// API-42: call through the generated, type-safe internal client. Query values
	// are the DTO's INPUT type (strings), and the response type comes from the
	// backend's @ApiResponse DTO.
	const { take, skip, ownership, label, ownerIds, sortBy } = options;
	return await createInternalApiClient(context).apiKeys.getApiKeys({
		query: {
			take: take?.toString(),
			skip: skip?.toString(),
			ownership,
			label,
			// Comma-joined so it survives query-string serialization; the backend
			// splits it back into an array.
			ownerIds: ownerIds?.length ? ownerIds.join(',') : undefined,
			sortBy: sortBy as ListApiKeysSortOption | undefined,
		},
	});
}

export async function getApiKeyScopes(context: IRestApiContext): Promise<ApiKeyScope[]> {
	return await createInternalApiClient(context).apiKeys.getApiKeyScopes();
}

export async function createApiKey(
	context: IRestApiContext,
	payload: CreateApiKeyRequestDto,
): Promise<ApiKeyWithRawValue> {
	return await createInternalApiClient(context).apiKeys.createApiKey({ body: payload });
}

export async function deleteApiKey(
	context: IRestApiContext,
	id: string,
): Promise<{ success: boolean }> {
	return await createInternalApiClient(context).apiKeys.deleteApiKey({ params: { id } });
}

export async function updateApiKey(
	context: IRestApiContext,
	id: string,
	payload: UpdateApiKeyRequestDto,
): Promise<{ success: boolean }> {
	return await createInternalApiClient(context).apiKeys.updateApiKey({
		params: { id },
		body: payload,
	});
}

export async function rotateApiKey(
	context: IRestApiContext,
	id: string,
): Promise<ApiKeyWithRawValue> {
	return await createInternalApiClient(context).apiKeys.rotateApiKey({ params: { id } });
}
