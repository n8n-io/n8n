import { STORES } from '@/constants';
import { defineStore } from 'pinia';
import { useRootStore } from '@/stores/root.store';

import * as publicApiApi from '@/api/api-keys';
import { computed, ref } from 'vue';
import { useSettingsStore } from './settings.store';
import type { ApiKey, CreateApiKeyRequestDto, UpdateApiKeyRequestDto } from '@n8n/api-types';

export const useApiKeysStore = defineStore(STORES.API_KEYS, () => {
	const apiKeys = ref<ApiKey[]>([]);

	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const apiKeysSortByCreationDate = computed(() =>
		apiKeys.value.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
	);

	const apiKeysById = computed(() => {
		return apiKeys.value.reduce(
			(acc, apiKey) => {
				acc[apiKey.id] = apiKey;
				return acc;
			},
			{} as Record<string, ApiKey>,
		);
	});

	const canAddMoreApiKeys = computed(
		() => apiKeys.value.length < settingsStore.api.apiKeysPerUserLimit,
	);

	const getAndCacheApiKeys = async () => {
		if (apiKeys.value.length) return apiKeys.value;
		apiKeys.value = await publicApiApi.getApiKeys(rootStore.restApiContext);
		return apiKeys.value;
	};

	const createApiKey = async (payload: CreateApiKeyRequestDto) => {
		const newApiKey = await publicApiApi.createApiKey(rootStore.restApiContext, payload);
		const { rawApiKey, ...rest } = newApiKey;
		apiKeys.value.push(rest);
		return newApiKey;
	};

	const deleteApiKey = async (id: string) => {
		await publicApiApi.deleteApiKey(rootStore.restApiContext, id);
		apiKeys.value = apiKeys.value.filter((apiKey) => apiKey.id !== id);
	};

	const updateApiKey = async (id: string, payload: UpdateApiKeyRequestDto) => {
		await publicApiApi.updateApiKey(rootStore.restApiContext, id, payload);
		apiKeysById.value[id].label = payload.label;
	};

	return {
		getAndCacheApiKeys,
		createApiKey,
		deleteApiKey,
		updateApiKey,
		apiKeysSortByCreationDate,
		apiKeysById,
		apiKeys,
		canAddMoreApiKeys,
	};
});
