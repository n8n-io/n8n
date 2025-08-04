import { defineStore } from 'pinia';
import { DATA_STORE_STORE } from '@/features/dataStore/constants';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { fetchDataStores, createDataStore } from '@/features/dataStore/datastore.api';
import type { DataStoreEntity } from '@/features/dataStore/datastore.types';

export const useDataStoreStore = defineStore(DATA_STORE_STORE, () => {
	const rootStore = useRootStore();

	const dataStores = ref<DataStoreEntity[]>([]);
	const totalCount = ref(0);

	const loadDataStores = async (projectId: string, page: number, pageSize: number) => {
		const response = await fetchDataStores(rootStore.restApiContext, projectId, {
			page,
			pageSize,
		});
		dataStores.value = response.data;
		totalCount.value = response.count;
	};

	const createNewDataStore = async (name: string, projectId?: string) => {
		const newStore = await createDataStore(rootStore.restApiContext, name, projectId);
		dataStores.value.push(newStore.data);
		totalCount.value += 1;
		return newStore;
	};

	return {
		dataStores,
		totalCount,
		loadDataStores,
		createNewDataStore,
	};
});
