import { defineStore } from 'pinia';
import { DATA_STORE_STORE } from '@/features/dataStore/constants';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchDataStoresApi,
	createDataStoreApi,
	deleteDataStoreApi,
	updateDataStoreApi,
	addDataStoreColumnApi,
	getDataStoreRowsApi,
	insertDataStoreRowApi,
	upsertDataStoreRowsApi,
} from '@/features/dataStore/dataStore.api';
import type {
	DataStore,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import { useProjectsStore } from '@/stores/projects.store';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';

export const useDataStoreStore = defineStore(DATA_STORE_STORE, () => {
	const rootStore = useRootStore();
	const projectStore = useProjectsStore();

	const dataStoreTypes = useDataStoreTypes();

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

	const createDataStore = async (name: string, projectId: string) => {
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

	const deleteDataStore = async (datastoreId: string, projectId: string) => {
		const deleted = await deleteDataStoreApi(rootStore.restApiContext, datastoreId, projectId);
		if (deleted) {
			dataStores.value = dataStores.value.filter((store) => store.id !== datastoreId);
			totalCount.value -= 1;
		}
		return deleted;
	};

	const updateDataStore = async (datastoreId: string, name: string, projectId: string) => {
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
			projectId,
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

	const addDataStoreColumn = async (
		datastoreId: string,
		projectId: string,
		column: DataStoreColumnCreatePayload,
	) => {
		const newColumn = await addDataStoreColumnApi(
			rootStore.restApiContext,
			datastoreId,
			projectId,
			column,
		);
		if (newColumn) {
			const index = dataStores.value.findIndex((store) => store.id === datastoreId);
			if (index !== -1) {
				dataStores.value[index].columns.push(newColumn);
			}
		}
		return newColumn;
	};

	const fetchDataStoreContent = async (
		datastoreId: string,
		projectId: string,
		page: number,
		pageSize: number,
	) => {
		return await getDataStoreRowsApi(rootStore.restApiContext, datastoreId, projectId, {
			skip: (page - 1) * pageSize,
			take: pageSize,
		});
	};

	const insertEmptyRow = async (dataStore: DataStore) => {
		const emptyRow: DataStoreRow = {};
		dataStore.columns.forEach((column) => {
			// Set default values based on column type
			emptyRow[column.name] = dataStoreTypes.getDefaultValueForType(column.type);
		});
		return await insertDataStoreRowApi(
			rootStore.restApiContext,
			dataStore.id,
			emptyRow,
			dataStore.projectId,
		);
	};

	const upsertRow = async (dataStoreId: string, projectId: string, row: DataStoreRow) => {
		return await upsertDataStoreRowsApi(rootStore.restApiContext, dataStoreId, [row], projectId);
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
		addDataStoreColumn,
		fetchDataStoreContent,
		insertEmptyRow,
		upsertRow,
	};
});
