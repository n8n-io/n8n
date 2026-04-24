import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as encryptionKeysApi from './encryption-keys.api';
import type {
	EncryptionKey,
	EncryptionKeyFilters,
	EncryptionKeySort,
} from './encryption-keys.types';

const DEFAULT_SORT: EncryptionKeySort = { field: 'activatedAt', direction: 'desc' };

const DEFAULT_FILTERS: EncryptionKeyFilters = {
	activatedFrom: null,
	activatedTo: null,
	createdByIds: [],
};

export const useEncryptionKeysStore = defineStore('encryptionKeys', () => {
	const rootStore = useRootStore();

	const keys = ref<EncryptionKey[]>([]);
	const isLoading = ref(false);
	const isRotating = ref(false);
	const sort = ref<EncryptionKeySort>({ ...DEFAULT_SORT });
	const filters = ref<EncryptionKeyFilters>({ ...DEFAULT_FILTERS });

	const getDateValue = (key: EncryptionKey, field: 'activatedAt' | 'archivedAt'): string | null =>
		key[field];

	const compareKeys = (a: EncryptionKey, b: EncryptionKey, field: EncryptionKeySort['field']) => {
		if (field === 'createdBy') {
			const nameA = `${a.createdBy.firstName} ${a.createdBy.lastName}`.trim().toLowerCase();
			const nameB = `${b.createdBy.firstName} ${b.createdBy.lastName}`.trim().toLowerCase();
			return nameA.localeCompare(nameB);
		}

		if (field === 'type') {
			return a.status.localeCompare(b.status);
		}

		const valueA = getDateValue(a, field);
		const valueB = getDateValue(b, field);

		if (valueA === null && valueB === null) return 0;
		if (valueA === null) return 1;
		if (valueB === null) return -1;

		return new Date(valueA).getTime() - new Date(valueB).getTime();
	};

	const matchesFilters = (key: EncryptionKey) => {
		const { activatedFrom, activatedTo, createdByIds } = filters.value;
		const activatedAt = new Date(key.activatedAt).getTime();

		if (activatedFrom && activatedAt < new Date(activatedFrom).getTime()) return false;
		if (activatedTo && activatedAt > new Date(activatedTo).getTime()) return false;
		if (createdByIds.length > 0 && !createdByIds.includes(key.createdBy.id)) return false;

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

	const createdByOptions = computed(() => {
		const seen = new Map<string, EncryptionKey['createdBy']>();
		for (const key of keys.value) {
			if (!seen.has(key.createdBy.id)) {
				seen.set(key.createdBy.id, key.createdBy);
			}
		}
		return Array.from(seen.values());
	});

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
		createdByOptions,
		fetchKeys,
		rotateKey,
		setSort,
		setFilters,
		resetFilters,
	};
});
