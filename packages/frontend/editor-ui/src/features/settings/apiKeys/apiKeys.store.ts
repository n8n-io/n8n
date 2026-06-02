import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as publicApiApi from '@n8n/rest-api-client/api/api-keys';
import { computed, ref } from 'vue';
import type {
	ApiKey,
	ApiKeyOwnership,
	CreateApiKeyRequestDto,
	UpdateApiKeyRequestDto,
} from '@n8n/api-types';
import type { ApiKeyScope } from '@n8n/permissions';

const DEFAULT_PAGE_SIZE = 10;

export const useApiKeysStore = defineStore(STORES.API_KEYS, () => {
	const apiKeys = ref<ApiKey[]>([]);
	/** Server-side ownership filter: 'mine' = caller's own keys, 'all' = every key on the instance. */
	const ownership = ref<ApiKeyOwnership>('mine');
	/** Case-insensitive substring filter applied server-side to the label. */
	const labelFilter = ref('');
	/** Cross-page totals per ownership filter, populated from the GET response. */
	const mineCount = ref(0);
	const allCount = ref(0);
	/** Total number of API keys for the current ownership filter, across every page. */
	const apiKeysCount = computed(() =>
		ownership.value === 'mine' ? mineCount.value : allCount.value,
	);
	const page = ref(1);
	const pageSize = ref(DEFAULT_PAGE_SIZE);
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

	const fetchApiKeys = async () => {
		const trimmed = labelFilter.value.trim();
		const response = await publicApiApi.getApiKeys(rootStore.restApiContext, {
			take: pageSize.value,
			skip: (page.value - 1) * pageSize.value,
			ownership: ownership.value,
			...(trimmed ? { label: trimmed } : {}),
		});
		apiKeys.value = response.items;
		mineCount.value = response.counts.mine;
		allCount.value = response.counts.all;
		return response;
	};

	const setPage = async (newPage: number) => {
		page.value = newPage;
		await fetchApiKeys();
	};

	const setPageSize = async (newPageSize: number) => {
		pageSize.value = newPageSize;
		page.value = 1;
		await fetchApiKeys();
	};

	const setOwnership = async (newOwnership: ApiKeyOwnership) => {
		if (ownership.value === newOwnership) return;
		ownership.value = newOwnership;
		page.value = 1;
		await fetchApiKeys();
	};

	const setLabelFilter = async (newFilter: string) => {
		if (labelFilter.value === newFilter) return;
		labelFilter.value = newFilter;
		page.value = 1;
		await fetchApiKeys();
	};

	const createApiKey = async (payload: CreateApiKeyRequestDto) => {
		const newApiKey = await publicApiApi.createApiKey(rootStore.restApiContext, payload);
		// New key lands at the top (createdAt DESC) — return to page 1 and refetch so
		// every consumer sees the same server state regardless of which page they were on.
		page.value = 1;
		await fetchApiKeys();
		return newApiKey;
	};

	const deleteApiKey = async (id: string) => {
		await publicApiApi.deleteApiKey(rootStore.restApiContext, id);
		// Refetching keeps the counts honest and handles the page-becomes-empty edge case.
		const remaining = apiKeysCount.value - 1;
		const lastPage = Math.max(1, Math.ceil(remaining / pageSize.value));
		if (page.value > lastPage) page.value = lastPage;
		await fetchApiKeys();
	};

	const updateApiKey = async (id: string, payload: UpdateApiKeyRequestDto) => {
		await publicApiApi.updateApiKey(rootStore.restApiContext, id, payload);
		apiKeysById.value[id].label = payload.label;
		apiKeysById.value[id].scopes = payload.scopes;
	};

	return {
		fetchApiKeys,
		setPage,
		setPageSize,
		setOwnership,
		setLabelFilter,
		createApiKey,
		deleteApiKey,
		updateApiKey,
		getApiKeyAvailableScopes,
		apiKeysById,
		apiKeys,
		apiKeysCount,
		ownership,
		labelFilter,
		mineCount,
		allCount,
		page,
		pageSize,
		availableScopes,
	};
});
