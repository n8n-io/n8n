import { defineStore } from 'pinia';
import { DATA_TABLE_STORE } from '@/features/core/dataTable/constants';
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
	renameDataTableColumnApi,
	getDataTableRowsApi,
	insertDataTableRowApi,
	updateDataTableRowsApi,
	deleteDataTableRowsApi,
	fetchDataTableGlobalLimitInBytes,
	downloadDataTableCsvApi,
	uploadCsvFileApi,
} from '@/features/core/dataTable/dataTable.api';
import type {
	DataTable,
	DataTableColumnCreatePayload,
	DataTableRow,
} from '@/features/core/dataTable/dataTable.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { reorderItem } from '@/features/core/dataTable/utils';
import { type DataTableSizeStatus } from 'n8n-workflow';
import { useSettingsStore } from '@/app/stores/settings.store';
import { getResourcePermissions } from '@n8n/permissions';
import { hasPermission } from '@/app/utils/rbac/permissions';

export const useDataTableStore = defineStore(DATA_TABLE_STORE, () => {
	const rootStore = useRootStore();
	const projectStore = useProjectsStore();
	const settingsStore = useSettingsStore();

	const dataTables = ref<DataTable[]>([]);
	const totalCount = ref(0);
	const dataTableSize = ref(0);
	const dataTableSizeLimitState = ref<DataTableSizeStatus>('ok');
	const dataTableTableSizes = ref<Record<string, number>>({});

	const UTF8_BOM = '\uFEFF';

	const projectPermissions = computed(() =>
		getResourcePermissions(
			projectStore.currentProject?.scopes ?? projectStore.personalProject?.scopes,
		),
	);

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

	const canViewDataTables = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'dataTable:list' } }),
	);

	const fetchDataTables = async (projectId: string, page: number, pageSize: number) => {
		const response = await fetchDataTablesApi(rootStore.restApiContext, projectId, {
			skip: (page - 1) * pageSize,
			take: pageSize,
		});
		dataTables.value = response.data;
		totalCount.value = response.count;
	};

	const createDataTable = async (
		name: string,
		projectId: string,
		columns?: DataTableColumnCreatePayload[],
		fileId?: string,
		hasHeaders: boolean = true,
	) => {
		const newTable = await createDataTableApi(
			rootStore.restApiContext,
			name,
			projectId,
			columns,
			fileId,
			hasHeaders,
		);
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

	const uploadCsvFile = async (file: File, hasHeaders: boolean = true) => {
		return await uploadCsvFileApi(rootStore.restApiContext, file, hasHeaders);
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

	const renameDataTableColumn = async (
		dataTableId: string,
		projectId: string,
		columnId: string,
		newName: string,
	): Promise<void> => {
		await renameDataTableColumnApi(
			rootStore.restApiContext,
			dataTableId,
			projectId,
			columnId,
			newName,
		);

		const index = dataTables.value.findIndex((table) => table.id === dataTableId);
		if (index === -1) return;

		const table = dataTables.value[index];
		const column = table.columns.find((col) => col.id === columnId);
		if (column) {
			column.name = newName;
		}
	};

	const fetchDataTableContent = async (
		dataTableId: string,
		projectId: string,
		page: number,
		pageSize: number,
		sortBy: string,
		filter?: string,
		search?: string,
	) => {
		return await getDataTableRowsApi(rootStore.restApiContext, dataTableId, projectId, {
			skip: (page - 1) * pageSize,
			take: pageSize,
			sortBy,
			filter,
			search,
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

	const createCsvBlob = (csvContent: string): Blob => {
		// Add BOM for Excel compatibility with special characters
		return new Blob([UTF8_BOM + csvContent], {
			type: 'text/csv;charset=utf-8;',
		});
	};

	const triggerBrowserDownload = (blob: Blob, filename: string): void => {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');

		link.href = url;
		link.download = filename;
		link.style.display = 'none';

		document.body.appendChild(link);

		try {
			link.click();
		} finally {
			// Ensure cleanup happens even if click fails
			if (document.body.contains(link)) {
				document.body.removeChild(link);
			}
			URL.revokeObjectURL(url);
		}
	};

	const downloadDataTableCsv = async (dataTableId: string, projectId: string) => {
		const { csvContent, filename } = await downloadDataTableCsvApi(
			rootStore.restApiContext,
			dataTableId,
			projectId,
		);

		const csvBlob = createCsvBlob(csvContent);
		triggerBrowserDownload(csvBlob, filename);
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
		uploadCsvFile,
		deleteDataTable,
		updateDataTable,
		fetchDataTableDetails,
		fetchOrFindDataTable,
		addDataTableColumn,
		deleteDataTableColumn,
		moveDataTableColumn,
		renameDataTableColumn,
		fetchDataTableContent,
		insertEmptyRow,
		updateRow,
		deleteRows,
		downloadDataTableCsv,
		projectPermissions,
		canViewDataTables,
	};
});
