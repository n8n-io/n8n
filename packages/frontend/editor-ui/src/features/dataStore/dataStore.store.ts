import { defineStore } from 'pinia';
import { DATA_STORE_STORE } from '@/features/dataStore/constants';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchDataStoresApi,
	createDataStoreApi,
	deleteDataStoreApi,
	updateDataStoreApi,
	addDataStoreColumnApi,
	deleteDataStoreColumnApi,
	moveDataStoreColumnApi,
	getDataStoreRowsApi,
	insertDataStoreRowApi,
	updateDataStoreRowsApi,
	deleteDataStoreRowsApi,
	fetchDataStoreGlobalLimitInBytes,
} from '@/features/dataStore/dataStore.api';
import type {
	DataStore,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import { useProjectsStore } from '@/stores/projects.store';
import { reorderItem } from '@/features/dataStore/utils';
import { type DataTableSizeStatus } from 'n8n-workflow';
import { useSettingsStore } from '@/stores/settings.store';

export const useDataStoreStore = defineStore(DATA_STORE_STORE, () => {
	const rootStore = useRootStore();
	const projectStore = useProjectsStore();
	const settingsStore = useSettingsStore();

	const dataStores = ref<DataStore[]>([]);
	const totalCount = ref(0);
	const dataStoreSize = ref(0);
	const dataStoreSizeLimitState = ref<DataTableSizeStatus>('ok');
	const dataStoreTableSizes = ref<Record<string, number>>({});

	const formatSize = (sizeBytes: number) => {
		return Number((sizeBytes / 1024 / 1024).toFixed(2));
	};

	const maxSizeMB = computed(() =>
		Math.floor(settingsStore.settings?.dataTables?.maxSize / 1024 / 1024),
	);

	const dataStoreSizes = computed(() => {
		const formattedSizes: Record<string, number> = {};
		for (const [dataStoreId, sizeBytes] of Object.entries(dataStoreTableSizes.value)) {
			formattedSizes[dataStoreId] = formatSize(sizeBytes);
		}
		return formattedSizes;
	});

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

	const deleteDataStoreColumn = async (
		datastoreId: string,
		projectId: string,
		columnId: string,
	) => {
		const deleted = await deleteDataStoreColumnApi(
			rootStore.restApiContext,
			datastoreId,
			projectId,
			columnId,
		);
		if (deleted) {
			const index = dataStores.value.findIndex((store) => store.id === datastoreId);
			if (index !== -1) {
				dataStores.value[index].columns = dataStores.value[index].columns.filter(
					(col) => col.id !== columnId,
				);
			}
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
			dataStores.value = response.data;
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

	const moveDataStoreColumn = async (
		datastoreId: string,
		projectId: string,
		columnId: string,
		targetIndex: number,
	) => {
		const moved = await moveDataStoreColumnApi(
			rootStore.restApiContext,
			datastoreId,
			projectId,
			columnId,
			targetIndex,
		);
		if (moved) {
			const dsIndex = dataStores.value.findIndex((store) => store.id === datastoreId);
			const fromIndex = dataStores.value[dsIndex].columns.findIndex((col) => col.id === columnId);
			dataStores.value[dsIndex].columns = reorderItem(
				dataStores.value[dsIndex].columns,
				fromIndex,
				targetIndex,
			);
		}
		return moved;
	};

	const fetchDataStoreContent = async (
		datastoreId: string,
		projectId: string,
		page: number,
		pageSize: number,
		sortBy: string,
	) => {
		return await getDataStoreRowsApi(rootStore.restApiContext, datastoreId, projectId, {
			skip: (page - 1) * pageSize,
			take: pageSize,
			sortBy,
		});
	};

	const insertEmptyRow = async (dataStoreId: string, projectId: string) => {
		const inserted = await insertDataStoreRowApi(
			rootStore.restApiContext,
			dataStoreId,
			{},
			projectId,
		);
		return inserted[0];
	};

	const updateRow = async (
		dataStoreId: string,
		projectId: string,
		rowId: number,
		rowData: DataStoreRow,
	) => {
		return await updateDataStoreRowsApi(
			rootStore.restApiContext,
			dataStoreId,
			rowId,
			rowData,
			projectId,
		);
	};

	const deleteRows = async (dataStoreId: string, projectId: string, rowIds: number[]) => {
		return await deleteDataStoreRowsApi(rootStore.restApiContext, dataStoreId, rowIds, projectId);
	};

	const fetchDataStoreSize = async () => {
		const result = await fetchDataStoreGlobalLimitInBytes(rootStore.restApiContext);
		dataStoreSize.value = formatSize(result.sizeBytes);
		dataStoreSizeLimitState.value = result.sizeState;
		dataStoreTableSizes.value = result.dataTables;
		return result;
	};

	return {
		dataStores,
		totalCount,
		fetchDataStores,
		fetchDataStoreSize,
		dataStoreSize: computed(() => dataStoreSize.value),
		dataStoreSizeLimitState: computed(() => dataStoreSizeLimitState.value),
		dataStoreSizes,
		maxSizeMB,
		createDataStore,
		deleteDataStore,
		updateDataStore,
		fetchDataStoreDetails,
		fetchOrFindDataStore,
		addDataStoreColumn,
		deleteDataStoreColumn,
		moveDataStoreColumn,
		fetchDataStoreContent,
		insertEmptyRow,
		updateRow,
		deleteRows,
	};
});
