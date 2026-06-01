import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as publicApiApi from '@n8n/rest-api-client/api/api-keys';
import { computed, ref } from 'vue';
import type { ApiKey, CreateApiKeyRequestDto, UpdateApiKeyRequestDto } from '@n8n/api-types';
import { MAX_ITEMS_PER_PAGE } from '@n8n/api-types';
import type { ApiKeyScope } from '@n8n/permissions';

export const useApiKeysStore = defineStore(STORES.API_KEYS, () => {
	const apiKeys = ref<ApiKey[]>([]);
	/** Total number of API keys on the server across every page, not the size of the current page. */
	const apiKeysCount = ref(0);
	const availableScopes = ref<ApiKeyScope[]>([]);

	const rootStore = useRootStore();

	const apiKeysById = computed(() => {
		return apiKeys.value.reduce(
			(acc, apiKey) => {
				acc[apiKey.id] = apiKey;
				return acc;
			},
			{} as Record<string, ApiKey>,
		);
	});

	const getApiKeyAvailableScopes = async () => {
		availableScopes.value = await publicApiApi.getApiKeyScopes(rootStore.restApiContext);
		return availableScopes.value;
	};

	// Bridge default: the current card view has no pagination affordance, so
	// fetch the server max so admins on small instances still see everything.
	// The redesigned table will drive proper paging via N8nDataTableServer.
	const fetchApiKeys = async (options: { take?: number; skip?: number } = {}) => {
		const response = await publicApiApi.getApiKeys(rootStore.restApiContext, {
			take: options.take ?? MAX_ITEMS_PER_PAGE,
			skip: options.skip ?? 0,
		});
		apiKeys.value = response.items;
		apiKeysCount.value = response.count;
		return response;
	};

	const createApiKey = async (payload: CreateApiKeyRequestDto) => {
		const newApiKey = await publicApiApi.createApiKey(rootStore.restApiContext, payload);
		const { rawApiKey, ...rest } = newApiKey;
		apiKeys.value = [rest, ...apiKeys.value];
		apiKeysCount.value += 1;
		return newApiKey;
	};

	const deleteApiKey = async (id: string) => {
		await publicApiApi.deleteApiKey(rootStore.restApiContext, id);
		apiKeys.value = apiKeys.value.filter((apiKey) => apiKey.id !== id);
		apiKeysCount.value = Math.max(0, apiKeysCount.value - 1);
	};

	const updateApiKey = async (id: string, payload: UpdateApiKeyRequestDto) => {
		await publicApiApi.updateApiKey(rootStore.restApiContext, id, payload);
		apiKeysById.value[id].label = payload.label;
		apiKeysById.value[id].scopes = payload.scopes;
	};

	return {
		fetchApiKeys,
		createApiKey,
		deleteApiKey,
		updateApiKey,
		getApiKeyAvailableScopes,
		apiKeysById,
		apiKeys,
		apiKeysCount,
		availableScopes,
	};
});
