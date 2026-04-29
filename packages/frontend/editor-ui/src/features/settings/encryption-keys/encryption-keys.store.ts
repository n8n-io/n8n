import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as encryptionKeysApi from './encryption-keys.api';
import type {
	EncryptionKey,
	EncryptionKeyFilters,
	EncryptionKeySort,
} from './encryption-keys.types';

const DEFAULT_SORT: EncryptionKeySort = { field: 'createdAt', direction: 'desc' };

const DEFAULT_FILTERS: EncryptionKeyFilters = {
	activatedFrom: null,
	activatedTo: null,
};

export const useEncryptionKeysStore = defineStore('encryptionKeys', () => {
	const rootStore = useRootStore();

	const keys = ref<EncryptionKey[]>([]);
	const isLoading = ref(false);
	const isRotating = ref(false);
	const sort = ref<EncryptionKeySort>({ ...DEFAULT_SORT });
	const filters = ref<EncryptionKeyFilters>({ ...DEFAULT_FILTERS });

	const compareKeys = (a: EncryptionKey, b: EncryptionKey, field: EncryptionKeySort['field']) => {
		if (field === 'status') {
			return a.status.localeCompare(b.status);
		}

		if (field === 'updatedAt') {
			const valueA = a.status === 'inactive' ? a.updatedAt : null;
			const valueB = b.status === 'inactive' ? b.updatedAt : null;
			if (valueA === null && valueB === null) return 0;
			if (valueA === null) return 1;
			if (valueB === null) return -1;
			return new Date(valueA).getTime() - new Date(valueB).getTime();
		}

		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	};

	const matchesFilters = (key: EncryptionKey) => {
		const { activatedFrom, activatedTo } = filters.value;
		const activatedAt = new Date(key.createdAt).getTime();

		if (activatedFrom && activatedAt < new Date(activatedFrom).getTime()) return false;
		if (activatedTo && activatedAt > new Date(activatedTo).getTime()) return false;

		return true;
	};

	const visibleKeys = computed<EncryptionKey[]>(() => {
		const filtered = keys.value.filter(matchesFilters);
		const sorted = [...filtered].sort((a, b) => {
			const diff = compareKeys(a, b, sort.value.field);
			return sort.value.direction === 'asc' ? diff : -diff;
		});
		return sorted;
	});

	const activeKey = computed(() => keys.value.find((key) => key.status === 'active') ?? null);

	const isEmpty = computed(() => !isLoading.value && keys.value.length === 0);

	const fetchKeys = async () => {
		isLoading.value = true;
		try {
			keys.value = await encryptionKeysApi.getEncryptionKeys(rootStore.restApiContext);
		} finally {
			isLoading.value = false;
		}
	};

	const rotateKey = async () => {
		isRotating.value = true;
		try {
			await encryptionKeysApi.rotateEncryptionKey(rootStore.restApiContext);
			await fetchKeys();
		} finally {
			isRotating.value = false;
		}
	};

	const setSort = (next: EncryptionKeySort) => {
		sort.value = { ...next };
	};

	const setFilters = (next: Partial<EncryptionKeyFilters>) => {
		filters.value = { ...filters.value, ...next };
	};

	const resetFilters = () => {
		filters.value = { ...DEFAULT_FILTERS };
	};

	return {
		keys,
		visibleKeys,
		activeKey,
		isLoading,
		isRotating,
		isEmpty,
		sort,
		filters,
		fetchKeys,
		rotateKey,
		setSort,
		setFilters,
		resetFilters,
	};
});
