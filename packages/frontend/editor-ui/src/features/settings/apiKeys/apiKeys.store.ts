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
	/** Server-side ownership filter: 'mine' = caller's own keys, 'all' = every key on the instance. */
	const ownership = ref<ApiKeyOwnership>('mine');
	/** Case-insensitive substring filter applied server-side to the label. */
	const labelFilter = ref('');
	/** Cross-page totals per ownership filter, populated from the GET response. */
	const mineCount = ref(0);
	const allCount = ref(0);
	/**
	 * Session-sticky flag: `true` after we've seen at least one key on the
	 * instance. Used to keep the search input and the "create" CTA visible
	 * even when the active label filter zeros out `allCount` for the page.
	 */
	const hasAnyKeys = ref(false);
	/**
	 * Page, page-size, and sort state in `N8nDataTableServer`'s native shape.
	 * The view binds this via `storeToRefs` + `v-model:table-options`, so the
	 * store is the single source of truth — DTS writes flow back here, and
	 * action methods that need to reset the page mutate `tableOptions.value.page`
	 * directly.
	 */
	const tableOptions = ref<TableOptions>({
		page: 0,
		itemsPerPage: DEFAULT_PAGE_SIZE,
		sortBy: [],
	});
	/** Total number of API keys for the current ownership filter, across every page. */
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
		// Latch on the first non-empty response — but only when we're looking at
		// the unfiltered list, otherwise an instance that genuinely has no keys
		// could flip the flag based on a stale label.
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

	/**
	 * Refetch in response to a DTS `update:options` event. The v-model on
	 * `tableOptions` has already written the new page / itemsPerPage / sortBy
	 * into the store, so this is just a sync helper.
	 */
	const applyTableOptions = async () => {
		await fetchApiKeys();
	};

	const createApiKey = async (payload: CreateApiKeyRequestDto) => {
		const newApiKey = await publicApiApi.createApiKey(rootStore.restApiContext, payload);
		// New key lands at the top (createdAt DESC) — return to page 1 and refetch so
		// every consumer sees the same server state regardless of which page they were on.
		tableOptions.value.page = 0;
		await fetchApiKeys();
		return newApiKey;
	};

	const deleteApiKey = async (id: string) => {
		await publicApiApi.deleteApiKey(rootStore.restApiContext, id);
		// Refetching keeps the counts honest and handles the page-becomes-empty edge case.
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
