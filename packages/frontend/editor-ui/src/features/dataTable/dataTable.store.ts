import { defineStore } from 'pinia';
import { DATA_TABLE_STORE } from '@/features/dataTable/constants';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchDataTablesApi,
	createDataTableApi,
	deleteDataTableApi,
	updateDataTableApi,
	addDataTableColumnApi,
	deleteDataTableColumnApi,
	moveDataTableColumnApi,
	getDataTableRowsApi,
	insertDataTableRowApi,
	updateDataTableRowsApi,
	deleteDataTableRowsApi,
	fetchDataTableGlobalLimitInBytes,
} from '@/features/dataTable/dataTable.api';
import type {
	DataTable,
	DataTableColumnCreatePayload,
	DataTableRow,
} from '@/features/dataTable/dataTable.types';
import { useProjectsStore } from '@/features/projects/projects.store';
import { reorderItem } from '@/features/dataTable/utils';
import { type DataTableSizeStatus } from 'n8n-workflow';
import { useSettingsStore } from '@/stores/settings.store';

export const useDataTableStore = defineStore(DATA_TABLE_STORE, () => {
	const rootStore = useRootStore();
	const projectStore = useProjectsStore();
	const settingsStore = useSettingsStore();

	const dataTables = ref<DataTable[]>([]);
	const totalCount = ref(0);
	const dataTableSize = ref(0);
	const dataTableSizeLimitState = ref<DataTableSizeStatus>('ok');
	const dataTableTableSizes = ref<Record<string, number>>({});

	const formatSize = (sizeBytes: number) => {
		return Number((sizeBytes / 1024 / 1024).toFixed(2));
	};

	const maxSizeMB = computed(() =>
		Math.floor(settingsStore.settings?.dataTables?.maxSize / 1024 / 1024),
	);

	const dataTableSizes = computed(() => {
		const formattedSizes: Record<string, number> = {};
		for (const [dataTableId, sizeBytes] of Object.entries(dataTableTableSizes.value)) {
			formattedSizes[dataTableId] = formatSize(sizeBytes);
		}
		return formattedSizes;
	});

	const fetchDataTables = async (projectId: string, page: number, pageSize: number) => {
		const response = await fetchDataTablesApi(rootStore.restApiContext, projectId, {
			skip: (page - 1) * pageSize,
			take: pageSize,
		});
		dataTables.value = response.data;
		totalCount.value = response.count;
	};

	const createDataTable = async (name: string, projectId: string) => {
		const newTable = await createDataTableApi(rootStore.restApiContext, name, projectId);
		if (!newTable.project && projectId) {
			const project = await projectStore.fetchProject(projectId);
			if (project) {
				newTable.project = project;
			}
		}
		dataTables.value.push(newTable);
		totalCount.value += 1;
		return newTable;
	};

	const deleteDataTable = async (dataTableId: string, projectId: string) => {
		const deleted = await deleteDataTableApi(rootStore.restApiContext, dataTableId, projectId);
		if (deleted) {
			dataTables.value = dataTables.value.filter((dataTable) => dataTable.id !== dataTableId);
			totalCount.value -= 1;
		}
		return deleted;
	};

	const deleteDataTableColumn = async (
		dataTableId: string,
		projectId: string,
		columnId: string,
	) => {
		const deleted = await deleteDataTableColumnApi(
			rootStore.restApiContext,
			dataTableId,
			projectId,
			columnId,
		);
		if (deleted) {
			const index = dataTables.value.findIndex((dataTable) => dataTable.id === dataTableId);
			if (index !== -1) {
				dataTables.value[index].columns = dataTables.value[index].columns.filter(
					(column) => column.id !== columnId,
				);
			}
		}
		return deleted;
	};

	const updateDataTable = async (dataTableId: string, name: string, projectId: string) => {
		const updated = await updateDataTableApi(
			rootStore.restApiContext,
			dataTableId,
			name,
			projectId,
		);
		if (updated) {
			const index = dataTables.value.findIndex((table) => table.id === dataTableId);
			if (index !== -1) {
				dataTables.value[index] = { ...dataTables.value[index], name };
			}
		}
		return updated;
	};

	const fetchDataTableDetails = async (dataTableId: string, projectId: string) => {
		const response = await fetchDataTablesApi(rootStore.restApiContext, projectId, undefined, {
			projectId,
			id: dataTableId,
		});
		if (response.data.length > 0) {
			dataTables.value = response.data;
			return response.data[0];
		}
		return null;
	};

	const fetchOrFindDataTable = async (dataTableId: string, projectId: string) => {
		const existingTable = dataTables.value.find((table) => table.id === dataTableId);
		if (existingTable) {
			return existingTable;
		}
		return await fetchDataTableDetails(dataTableId, projectId);
	};

	const addDataTableColumn = async (
		dataTableId: string,
		projectId: string,
		column: DataTableColumnCreatePayload,
	) => {
		const newColumn = await addDataTableColumnApi(
			rootStore.restApiContext,
			dataTableId,
			projectId,
			column,
		);
		if (newColumn) {
			const index = dataTables.value.findIndex((table) => table.id === dataTableId);
			if (index !== -1) {
				dataTables.value[index].columns.push(newColumn);
			}
		}
		return newColumn;
	};

	const moveDataTableColumn = async (
		dataTableId: string,
		projectId: string,
		columnId: string,
		targetIndex: number,
	) => {
		const moved = await moveDataTableColumnApi(
			rootStore.restApiContext,
			dataTableId,
			projectId,
			columnId,
			targetIndex,
		);
		if (moved) {
			const dsIndex = dataTables.value.findIndex((table) => table.id === dataTableId);
			const fromIndex = dataTables.value[dsIndex].columns.findIndex((col) => col.id === columnId);
			dataTables.value[dsIndex].columns = reorderItem(
				dataTables.value[dsIndex].columns,
				fromIndex,
				targetIndex,
			);
		}
		return moved;
	};

	const fetchDataTableContent = async (
		dataTableId: string,
		projectId: string,
		page: number,
		pageSize: number,
		sortBy: string,
		filter?: string,
	) => {
		return await getDataTableRowsApi(rootStore.restApiContext, dataTableId, projectId, {
			skip: (page - 1) * pageSize,
			take: pageSize,
			sortBy,
			filter,
		});
	};

	const insertEmptyRow = async (dataTableId: string, projectId: string) => {
		const inserted = await insertDataTableRowApi(
			rootStore.restApiContext,
			dataTableId,
			{},
			projectId,
		);
		return inserted[0];
	};

	const updateRow = async (
		dataTableId: string,
		projectId: string,
		rowId: number,
		rowData: DataTableRow,
	) => {
		return await updateDataTableRowsApi(
			rootStore.restApiContext,
			dataTableId,
			rowId,
			rowData,
			projectId,
		);
	};

	const deleteRows = async (dataTableId: string, projectId: string, rowIds: number[]) => {
		return await deleteDataTableRowsApi(rootStore.restApiContext, dataTableId, rowIds, projectId);
	};

	const fetchDataTableSize = async () => {
		const result = await fetchDataTableGlobalLimitInBytes(rootStore.restApiContext);
		dataTableSize.value = formatSize(result.totalBytes);
		dataTableSizeLimitState.value = result.quotaStatus;

		const tableSizes: Record<string, number> = {};
		for (const [dataTableId, info] of Object.entries(result.dataTables)) {
			tableSizes[dataTableId] = info.sizeBytes;
		}
		dataTableTableSizes.value = tableSizes;

		return result;
	};

	return {
		dataTables,
		totalCount,
		fetchDataTables,
		fetchDataTableSize,
		dataTableSize: computed(() => dataTableSize.value),
		dataTableSizeLimitState: computed(() => dataTableSizeLimitState.value),
		dataTableSizes,
		maxSizeMB,
		createDataTable,
		deleteDataTable,
		updateDataTable,
		fetchDataTableDetails,
		fetchOrFindDataTable,
		addDataTableColumn,
		deleteDataTableColumn,
		moveDataTableColumn,
		fetchDataTableContent,
		insertEmptyRow,
		updateRow,
		deleteRows,
	};
});
