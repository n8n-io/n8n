import { STORES } from '@/constants';
import { defineStore } from 'pinia';
import { useRootStore } from '@/stores/root.store';

import * as publicApiApi from '@/api/api-keys';
import { computed, ref } from 'vue';
import { useSettingsStore } from './settings.store';
import type { ApiKey } from '@n8n/api-types';

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

	const createApiKey = async (label: string) => {
		const newApiKey = await publicApiApi.createApiKey(rootStore.restApiContext, { label });
		const { rawApiKey, ...rest } = newApiKey;
		apiKeys.value.push(rest);
		return newApiKey;
	};

	const deleteApiKey = async (id: string) => {
		await publicApiApi.deleteApiKey(rootStore.restApiContext, id);
		apiKeys.value = apiKeys.value.filter((apiKey) => apiKey.id !== id);
	};

	const updateApiKey = async (id: string, data: { label: string }) => {
		await publicApiApi.updateApiKey(rootStore.restApiContext, id, data);
		apiKeysById.value[id].label = data.label;
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
