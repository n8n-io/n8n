import { STORES } from '@/constants';
import type { ApiKey } from '@/Interface';
import { defineStore } from 'pinia';
import { useRootStore } from '@/stores/root.store';

import * as publicApiApi from '@/api/api-keys';
import { computed, ref } from 'vue';

export const useApiKeysStore = defineStore(STORES.API_KEYS, () => {
	const apiKeys = ref<ApiKey[]>([]);

	const rootStore = useRootStore();

	const apiKeysSortByCreationDate = computed(() =>
		apiKeys.value.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
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

	const getAllApiKeys = async () => {
		if (apiKeys.value.length) return apiKeys.value;
		apiKeys.value = await publicApiApi.getApiKeys(rootStore.restApiContext);
		return apiKeys.value;
	};

	const createApiKey = async (label: string) => {
		const newApiKey = await publicApiApi.createApiKey(rootStore.restApiContext, { label });
		apiKeys.value.push(newApiKey);
		return newApiKey;
	};

	const deleteApiKey = async (id: string) => {
		await publicApiApi.deleteApiKey(rootStore.restApiContext, id);
		apiKeys.value = apiKeys.value.filter((apiKey) => apiKey.id !== id);
	};

	const updateApiKey = async (id: string, data: { label: string }) => {
		await publicApiApi.updateApiKey(rootStore.restApiContext, id, data);
	};

	return {
		getAllApiKeys,
		createApiKey,
		deleteApiKey,
		updateApiKey,
		apiKeysSortByCreationDate,
		apiKeysById,
		apiKeys,
	};
});
