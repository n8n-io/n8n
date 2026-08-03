import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as publicApiApi from '@n8n/rest-api-client/api/api-keys';
import { computed, ref } from 'vue';
import type {
	ApiKey,
	ApiKeyOwnerSummary,
	ApiKeyOwnership,
	CreateApiKeyRequestDto,
	UpdateApiKeyRequestDto,
} from '@n8n/api-types';
import type { ApiKeyScope } from '@n8n/permissions';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';

const DEFAULT_PAGE_SIZE = 10;
const initialTableOptions = (): TableOptions => ({
	page: 0,
	itemsPerPage: DEFAULT_PAGE_SIZE,
	sortBy: [],
});

export const useApiKeysStore = defineStore(STORES.API_KEYS, () => {
	const apiKeys = ref<ApiKey[]>([]);
	const ownership = ref<ApiKeyOwnership>('mine');
	const labelFilter = ref('');
	// Owners to narrow the `all` view to. `null` means all owners (the default,
	// no narrowing); a subset narrows; an empty array also reads as no narrowing.
	const ownerIds = ref<string[] | null>(null);
	// Distinct owners holding keys (with key counts), for the owner filter.
	const owners = ref<ApiKeyOwnerSummary[]>([]);
	const mineCount = ref(0);
	const allCount = ref(0);
	const totalMineCount = ref(0);
	const totalAllCount = ref(0);
	const tableOptions = ref<TableOptions>(initialTableOptions());
	const availableScopes = ref<ApiKeyScope[]>([]);

	const apiKeysCount = computed(() =>
		ownership.value === 'mine' ? mineCount.value : allCount.value,
	);
	const totalCountForOwnership = computed(() =>
		ownership.value === 'mine' ? totalMineCount.value : totalAllCount.value,
	);
	const hasAnyKeys = computed(() => totalAllCount.value > 0);

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
			...(ownerIds.value?.length ? { ownerIds: ownerIds.value } : {}),
			...(sortBy ? { sortBy } : {}),
		});
		apiKeys.value = response.items;
		owners.value = response.owners;
		mineCount.value = response.counts.mine;
		allCount.value = response.counts.all;
		totalMineCount.value = response.totals.mine;
		totalAllCount.value = response.totals.all;
		return response;
	};

	const setOwnership = async (newOwnership: ApiKeyOwnership) => {
		if (ownership.value === newOwnership) return;
		ownership.value = newOwnership;
		// The owner filter only applies to the `all` view; reset it so switching
		// tabs starts from "all owners" again.
		ownerIds.value = null;
		tableOptions.value.page = 0;
		await fetchApiKeys();
	};

	const setOwnerFilter = async (selected: string[]) => {
		// Selecting every owner is the same as no narrowing, so collapse it to
		// `null` to keep the request clean and the tab badges unfiltered.
		const next = selected.length === owners.value.length ? null : selected;
		const current = ownerIds.value;
		const unchanged =
			(current === null && next === null) ||
			(Array.isArray(current) &&
				Array.isArray(next) &&
				current.length === next.length &&
				next.every((id) => current.includes(id)));
		if (unchanged) return;
		ownerIds.value = next;
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
		// Clear the filter so the newly created key isn't hidden by an active search.
		labelFilter.value = '';
		tableOptions.value.page = 0;
		await fetchApiKeys();
		return newApiKey;
	};

	const deleteApiKey = async (id: string) => {
		await publicApiApi.deleteApiKey(rootStore.restApiContext, id);
		// Clamp against the filtered count so the next fetch can't land past the result set.
		const remaining = apiKeysCount.value - 1;
		const lastPage = Math.max(0, Math.ceil(remaining / tableOptions.value.itemsPerPage) - 1);
		if (tableOptions.value.page > lastPage) tableOptions.value.page = lastPage;
		await fetchApiKeys();
	};

	const updateApiKey = async (id: string, payload: UpdateApiKeyRequestDto) => {
		await publicApiApi.updateApiKey(rootStore.restApiContext, id, payload);
		// Refetch so the row re-sorts and any tab/filter narrowing stays consistent.
		await fetchApiKeys();
	};

	const rotateApiKey = async (id: string) => {
		const rotatedApiKey = await publicApiApi.rotateApiKey(rootStore.restApiContext, id);
		// The row stays in place; refetch to surface the reset last-used value.
		await fetchApiKeys();
		return rotatedApiKey;
	};

	const $reset = () => {
		apiKeys.value = [];
		ownership.value = 'mine';
		labelFilter.value = '';
		ownerIds.value = null;
		owners.value = [];
		mineCount.value = 0;
		allCount.value = 0;
		totalMineCount.value = 0;
		totalAllCount.value = 0;
		tableOptions.value = initialTableOptions();
	};

	return {
		fetchApiKeys,
		setOwnership,
		setLabelFilter,
		setOwnerFilter,
		applyTableOptions,
		createApiKey,
		deleteApiKey,
		updateApiKey,
		rotateApiKey,
		getApiKeyAvailableScopes,
		apiKeysById,
		apiKeys,
		apiKeysCount,
		totalCountForOwnership,
		ownership,
		labelFilter,
		ownerIds,
		owners,
		mineCount,
		allCount,
		totalMineCount,
		totalAllCount,
		hasAnyKeys,
		tableOptions,
		availableScopes,
		$reset,
	};
});
