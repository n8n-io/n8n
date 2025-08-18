import { defineStore } from 'pinia';
import { DATA_STORE_STORE } from '@/features/dataStore/constants';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchDataStoresApi,
	createDataStoreApi,
	deleteDataStoreApi,
	updateDataStoreApi,
} from '@/features/dataStore/dataStore.api';
import type { DataStore } from '@/features/dataStore/datastore.types';
import { useProjectsStore } from '@/stores/projects.store';

export const useDataStoreStore = defineStore(DATA_STORE_STORE, () => {
	const rootStore = useRootStore();
	const projectStore = useProjectsStore();

	const dataStores = ref<DataStore[]>([]);
	const totalCount = ref(0);

	const fetchDataStores = async (projectId: string, page: number, pageSize: number) => {
		const response = await fetchDataStoresApi(rootStore.restApiContext, projectId, {
			skip: (page - 1) * pageSize,
			take: pageSize,
		});
		dataStores.value = response.data;
		totalCount.value = response.count;
	};

	const createDataStore = async (name: string, projectId?: string) => {
		const newStore = await createDataStoreApi(rootStore.restApiContext, name, projectId);
		if (!newStore.project && projectId) {
			const project = await projectStore.fetchProject(projectId);
			if (project) {
				newStore.project = project;
			}
		}
		dataStores.value.push(newStore);
		totalCount.value += 1;
		return newStore;
	};

	const deleteDataStore = async (datastoreId: string, projectId?: string) => {
		const deleted = await deleteDataStoreApi(rootStore.restApiContext, datastoreId, projectId);
		if (deleted) {
			dataStores.value = dataStores.value.filter((store) => store.id !== datastoreId);
			totalCount.value -= 1;
		}
		return deleted;
	};

	const updateDataStore = async (datastoreId: string, name: string, projectId?: string) => {
		const updated = await updateDataStoreApi(
			rootStore.restApiContext,
			datastoreId,
			name,
			projectId,
		);
		if (updated) {
			const index = dataStores.value.findIndex((store) => store.id === datastoreId);
			if (index !== -1) {
				dataStores.value[index] = { ...dataStores.value[index], name };
			}
		}
		return updated;
	};

	const fetchDataStoreDetails = async (datastoreId: string, projectId: string) => {
		const response = await fetchDataStoresApi(rootStore.restApiContext, projectId, undefined, {
			id: datastoreId,
		});
		if (response.data.length > 0) {
			return response.data[0];
		}
		return null;
	};

	const fetchOrFindDataStore = async (datastoreId: string, projectId: string) => {
		const existingStore = dataStores.value.find((store) => store.id === datastoreId);
		if (existingStore) {
			return existingStore;
		}
		return await fetchDataStoreDetails(datastoreId, projectId);
	};

	return {
		dataStores,
		totalCount,
		fetchDataStores,
		createDataStore,
		deleteDataStore,
		updateDataStore,
		fetchDataStoreDetails,
		fetchOrFindDataStore,
	};
});
