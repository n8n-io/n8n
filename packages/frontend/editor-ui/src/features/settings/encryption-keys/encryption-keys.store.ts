import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as encryptionKeysApi from './encryption-keys.api';
import {
	toApiSort,
	type EncryptionKey,
	type EncryptionKeyFilters,
	type EncryptionKeySort,
} from './encryption-keys.types';

const DEFAULT_SORT: EncryptionKeySort = { field: 'createdAt', direction: 'desc' };

const DEFAULT_FILTERS: EncryptionKeyFilters = {
	activatedFrom: null,
	activatedTo: null,
};

const DEFAULT_PAGE = 0;
const DEFAULT_ITEMS_PER_PAGE = 25;

export const useEncryptionKeysStore = defineStore('encryptionKeys', () => {
	const rootStore = useRootStore();

	const items = ref<EncryptionKey[]>([]);
	const totalCount = ref(0);
	const isLoading = ref(false);
	const isRotating = ref(false);

	const page = ref(DEFAULT_PAGE);
	const itemsPerPage = ref(DEFAULT_ITEMS_PER_PAGE);
	const sort = ref<EncryptionKeySort>({ ...DEFAULT_SORT });
	const filters = ref<EncryptionKeyFilters>({ ...DEFAULT_FILTERS });

	const hasActiveFilters = computed(
		() => filters.value.activatedFrom !== null || filters.value.activatedTo !== null,
	);

	const activeKey = computed(() => items.value.find((key) => key.status === 'active') ?? null);

	const isEmpty = computed(
		() => !isLoading.value && totalCount.value === 0 && !hasActiveFilters.value,
	);

	const fetchKeys = async () => {
		isLoading.value = true;
		try {
			const response = await encryptionKeysApi.getEncryptionKeys(rootStore.restApiContext, {
				type: 'data_encryption',
				skip: page.value * itemsPerPage.value,
				take: itemsPerPage.value,
				sortBy: toApiSort(sort.value),
				activatedFrom: filters.value.activatedFrom ?? undefined,
				activatedTo: filters.value.activatedTo ?? undefined,
			});
			items.value = response.items as EncryptionKey[];
			totalCount.value = response.count;
		} finally {
			isLoading.value = false;
		}
	};

	const rotateKey = async () => {
		isRotating.value = true;
		try {
			await encryptionKeysApi.rotateEncryptionKey(rootStore.restApiContext);
			// After rotation, jump back to the first page sorted by `createdAt:desc`
			// so the newly active key is visible regardless of the previous view.
			page.value = DEFAULT_PAGE;
			sort.value = { ...DEFAULT_SORT };
			await fetchKeys();
		} finally {
			isRotating.value = false;
		}
	};

	const setPage = (next: number) => {
		page.value = next;
	};

	const setItemsPerPage = (next: number) => {
		itemsPerPage.value = next;
		page.value = DEFAULT_PAGE;
	};

	const setSort = (next: EncryptionKeySort) => {
		sort.value = { ...next };
		page.value = DEFAULT_PAGE;
	};

	const setFilters = (next: Partial<EncryptionKeyFilters>) => {
		filters.value = { ...filters.value, ...next };
		page.value = DEFAULT_PAGE;
	};

	const resetFilters = () => {
		filters.value = { ...DEFAULT_FILTERS };
		page.value = DEFAULT_PAGE;
	};

	return {
		items,
		totalCount,
		activeKey,
		isLoading,
		isRotating,
		isEmpty,
		page,
		itemsPerPage,
		sort,
		filters,
		fetchKeys,
		rotateKey,
		setPage,
		setItemsPerPage,
		setSort,
		setFilters,
		resetFilters,
	};
});
