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
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';

const DEFAULT_PAGE_SIZE = 10;

export const useApiKeysStore = defineStore(STORES.API_KEYS, () => {
	const apiKeys = ref<ApiKey[]>([]);
	const ownership = ref<ApiKeyOwnership>('mine');
	const labelFilter = ref('');
	const mineCount = ref(0);
	const allCount = ref(0);
	// Latched once we've seen any key, so a zero-result search doesn't hide the toolbar.
	const hasAnyKeys = ref(false);
	const tableOptions = ref<TableOptions>({
		page: 0,
		itemsPerPage: DEFAULT_PAGE_SIZE,
		sortBy: [],
	});
	const apiKeysCount = computed(() =>
		ownership.value === 'mine' ? mineCount.value : allCount.value,
	);
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
		const opts = tableOptions.value;
		const [sort] = opts.sortBy;
		const sortBy = sort ? `${sort.id}:${sort.desc ? 'desc' : 'asc'}` : undefined;
		const trimmed = labelFilter.value.trim();
		const response = await publicApiApi.getApiKeys(rootStore.restApiContext, {
			take: opts.itemsPerPage,
			skip: Math.max(0, opts.page) * opts.itemsPerPage,
			ownership: ownership.value,
			...(trimmed ? { label: trimmed } : {}),
			...(sortBy ? { sortBy } : {}),
		});
		apiKeys.value = response.items;
		mineCount.value = response.counts.mine;
		allCount.value = response.counts.all;
		// Only latch on an unfiltered response so a stale search can't flip the flag.
		if (!trimmed && response.counts.all > 0) hasAnyKeys.value = true;
		return response;
	};

	const setOwnership = async (newOwnership: ApiKeyOwnership) => {
		if (ownership.value === newOwnership) return;
		ownership.value = newOwnership;
		tableOptions.value.page = 0;
		await fetchApiKeys();
	};

	const setLabelFilter = async (newFilter: string) => {
		if (labelFilter.value === newFilter) return;
		labelFilter.value = newFilter;
		tableOptions.value.page = 0;
		await fetchApiKeys();
	};

	// DTS already wrote the new page/itemsPerPage/sortBy via v-model; we just refetch.
	const applyTableOptions = async () => {
		await fetchApiKeys();
	};

	const createApiKey = async (payload: CreateApiKeyRequestDto) => {
		const newApiKey = await publicApiApi.createApiKey(rootStore.restApiContext, payload);
		tableOptions.value.page = 0;
		await fetchApiKeys();
		return newApiKey;
	};

	const deleteApiKey = async (id: string) => {
		await publicApiApi.deleteApiKey(rootStore.restApiContext, id);
		const remaining = apiKeysCount.value - 1;
		const lastPage = Math.max(0, Math.ceil(remaining / tableOptions.value.itemsPerPage) - 1);
		if (tableOptions.value.page > lastPage) tableOptions.value.page = lastPage;
		await fetchApiKeys();
	};

	const updateApiKey = async (id: string, payload: UpdateApiKeyRequestDto) => {
		await publicApiApi.updateApiKey(rootStore.restApiContext, id, payload);
		apiKeysById.value[id].label = payload.label;
		apiKeysById.value[id].scopes = payload.scopes;
	};

	return {
		fetchApiKeys,
		setOwnership,
		setLabelFilter,
		applyTableOptions,
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
		hasAnyKeys,
		tableOptions,
		availableScopes,
	};
});
