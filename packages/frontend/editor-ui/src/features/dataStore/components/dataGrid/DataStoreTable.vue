<script setup lang="ts">
import { onMounted, ref } from 'vue';
import orderBy from 'lodash/orderBy';
import type {
	DataStore,
	DataStoreColumn,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import { AgGridVue } from 'ag-grid-vue3';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import type {
	GridApi,
	GridReadyEvent,
	ColDef,
	ColumnMovedEvent,
	ValueGetterParams,
	CellValueChangedEvent,
	RowSelectionOptions,
} from 'ag-grid-community';
import { n8nTheme } from '@/features/dataStore/components/dataGrid/n8nTheme';
import AddColumnPopover from '@/features/dataStore/components/dataGrid/AddColumnPopover.vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import ColumnHeader from '@/features/dataStore/components/dataGrid/ColumnHeader.vue';
import { DEFAULT_ID_COLUMN_NAME } from '@/features/dataStore/constants';
import {
	getDefaultValueForType,
	mapToAGCellType,
} from '@/features/dataStore/composables/useDataStoreTypes';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

type Props = {
	dataStore: DataStore;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	toggleSave: [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();

const dataStoreStore = useDataStoreStore();

// AG Grid State
const gridApi = ref<GridApi | null>(null);
const colDefs = ref<ColDef[]>([]);
const rowData = ref<DataStoreRow[]>([]);
const rowSelection = ref<RowSelectionOptions | 'single' | 'multiple'>({
	mode: 'singleRow',
	enableClickSelection: true,
	checkboxes: false,
});

const contentLoading = ref(false);

// Shared config for all columns
const defaultColumnDef = {
	flex: 1,
	sortable: false,
	filter: false,
};

// Pagination
const currentPage = ref(1);
const pageSize = ref(20);
const pageSizeOptions = ref([10, 20, 50]);
const totalItems = ref(0);

// Data store content
const rows = ref<DataStoreRow[]>([]);

const onGridReady = (params: GridReadyEvent) => {
	gridApi.value = params.api;
};

const setCurrentPage = async (page: number) => {
	currentPage.value = page;
	await fetchDataStoreContent();
};

const setPageSize = async (size: number) => {
	pageSize.value = size;
	currentPage.value = 1; // Reset to first page on page size change
	await fetchDataStoreContent();
};

const onDeleteColumn = async (columnId: string) => {
	// TODO: how can we skip doing this in all handlers?
	if (!gridApi.value) return;

	const columnToDeleteIndex = colDefs.value.findIndex((col) => col.colId === columnId);
	const columnToDelete = colDefs.value[columnToDeleteIndex];
	colDefs.value = colDefs.value.filter((def) => def.colId !== columnId);
	rowData.value = rowData.value.map((row) => {
		const { [columnId]: _, ...rest } = row;
		return rest;
	});
	gridApi.value.refreshHeader();
	try {
		await dataStoreStore.deleteDataStoreColumn(props.dataStore.id, columnId);
	} catch (error: unknown) {
		toast.showError(error as Error, i18n.baseText('dataStore.deleteColumn.error'));
		colDefs.value.splice(columnToDeleteIndex, 0, columnToDelete);
	}
};

const onAddColumn = async ({ column }: { column: DataStoreColumnCreatePayload }) => {
	emit('toggleSave', true);
	try {
		const newColumn = await dataStoreStore.addDataStoreColumn(props.dataStore.id, column);
		if (!newColumn) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		colDefs.value.push(createColumnDef(newColumn));
		rowData.value = rowData.value.map((row) => {
			return { ...row, [newColumn.id]: getDefaultValueForType(newColumn.type) };
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addColumn.error'));
	} finally {
		emit('toggleSave', false);
	}
};

const createColumnDef = (col: DataStoreColumn) => {
	const columnDef: ColDef = {
		colId: col.id,
		field: col.name,
		headerName: col.name,
		// TODO: Avoid hard-coding this
		editable: col.name !== DEFAULT_ID_COLUMN_NAME,
		cellDataType: mapToAGCellType(col.type),
		valueGetter: (params: ValueGetterParams<DataStoreRow>) => {
			// If the value is null, return the default value for the column type
			if (params.data?.[col.name] === null) {
				return getDefaultValueForType(col.type);
			}
			// Parse dates
			if (col.type === 'date') {
				return new Date(params.data?.[col.name] as string);
			}
			return params.data?.[col.name];
		},
		headerComponent: ColumnHeader,
		headerComponentParams: { onDelete: onDeleteColumn },
	};
	// Enable large text editor for text columns
	if (col.type === 'string') {
		columnDef.cellEditor = 'agLargeTextCellEditor';
		columnDef.cellEditorPopup = true;
	}
	// Setup date editor
	if (col.type === 'date') {
		columnDef.cellEditor = 'agDateCellEditor';
	}
	return columnDef;
};

const onAddRowClick = async () => {
	try {
		// Go to last page if we are not there already
		if (currentPage.value * pageSize.value < totalItems.value) {
			await setCurrentPage(Math.floor(totalItems.value / pageSize.value));
		}
		const inserted = await dataStoreStore.insertEmptyRow(props.dataStore);
		if (!inserted) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		await fetchDataStoreContent();
		emit('toggleSave', true);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addRow.error'));
	} finally {
		emit('toggleSave', false);
	}
};

const onColumnMoved = async (moveEvent: ColumnMovedEvent) => {
	console.log(moveEvent);
	if (!moveEvent.finished || moveEvent.source !== 'uiColumnMoved') {
		return;
	}

	try {
		await dataStoreStore.moveDataStoreColumn(
			props.dataStore.id,
			moveEvent.column?.getColId() ?? '',
			moveEvent.toIndex ?? 0,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.moveColumn.error'));
		// TODO: revert the move
	}
};

onMounted(() => {
	colDefs.value = orderBy(props.dataStore.columns, 'index').map((col) => ({
		...createColumnDef(col),
	}));
	if (gridApi.value) {
		gridApi.value.refreshHeader();
	}
});

const initColumnDefinitions = () => {
	colDefs.value = [
		// Always add the ID column, it's not returned by the back-end but all data stores have it
		// We use it as a placeholder for new datastores
		createColumnDef({
			index: 0,
			id: DEFAULT_ID_COLUMN_NAME,
			name: DEFAULT_ID_COLUMN_NAME,
			type: 'string',
		}),
		// Append other columns
		...props.dataStore.columns.map(createColumnDef),
	];
};

const fetchDataStoreContent = async () => {
	try {
		contentLoading.value = true;
		const fetchedRows = await dataStoreStore.fetchDataStoreContent(
			props.dataStore.id,
			props.dataStore.projectId ?? '',
			currentPage.value,
			pageSize.value,
		);
		rows.value = fetchedRows.data;
		totalItems.value = fetchedRows.count;
		rowData.value = rows.value;
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.fetchContent.error'));
	} finally {
		contentLoading.value = false;
		if (gridApi.value) {
			gridApi.value.refreshHeader();
		}
	}
};

const initialize = async () => {
	initColumnDefinitions();
	await fetchDataStoreContent();
};

const onCellValueChanged = async (params: CellValueChangedEvent) => {
	const { data } = params;
	try {
		emit('toggleSave', true);
		await dataStoreStore.upsertRow(props.dataStore.id, props.dataStore.projectId ?? '', data);
	} catch (error) {
		// TODO: Revert to old value if failed
		toast.showError(error, i18n.baseText('dataStore.updateRow.error'));
	} finally {
		emit('toggleSave', false);
	}
};

onMounted(async () => {
	await initialize();
});
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style['grid-container']">
			<AgGridVue
				style="width: 100%"
				:row-data="rowData"
				:column-defs="colDefs"
				:default-col-def="defaultColumnDef"
				:dom-layout="'autoHeight'"
				:animate-rows="false"
				:theme="n8nTheme"
				:loading="contentLoading"
				:row-selection="rowSelection"
				@grid-ready="onGridReady"
				@cell-value-changed="onCellValueChanged"
				@column-moved="onColumnMoved"
			/>
			<AddColumnPopover
				:data-store="props.dataStore"
				:class="$style['add-column-popover']"
				@add-column="onAddColumn"
			/>
		</div>
		<div :class="$style.footer">
			<n8n-icon-button icon="plus" class="mb-xl" type="secondary" @click="onAddRowClick" />
			<el-pagination
				v-model:current-page="currentPage"
				v-model:page-size="pageSize"
				background
				:total="totalItems"
				:page-sizes="pageSizeOptions"
				layout="total, prev, pager, next, sizes"
				data-test-id="data-store-content-pagination"
				@update:current-page="setCurrentPage"
				@size-change="setPageSize"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
	width: calc(100% - var(--spacing-m) * 2);
	align-items: center;
}

.grid-container {
	position: relative;
	display: flex;
	width: 100%;

	// AG Grid style overrides
	--ag-foreground-color: var(--color-text-base);
	--ag-accent-color: var(--color-primary);
	--ag-background-color: var(--color-background-xlight);
	--ag-border-color: var(--border-color-base);
	--ag-border-radius: var(--border-radius-base);
	--ag-wrapper-border-radius: 0;
	--ag-font-family: var(--font-family);
	--ag-font-size: var(--font-size-xs);
	--ag-row-height: calc(var(--ag-grid-size) * 0.8 + 32px);

	--ag-header-background-color: var(--color-background-base);
	--ag-header-font-size: var(--font-size-xs);
	--ag-header-font-weight: var(--font-weight-bold);
	--ag-header-foreground-color: var(--color-text-dark);
	--ag-cell-horizontal-padding: calc(var(--ag-grid-size) * 0.7);
	--ag-header-column-resize-handle-color: var(--border-color-base);
	--ag-header-column-resize-handle-height: 100%;
	--ag-header-height: calc(var(--ag-grid-size) * 0.8 + 32px);

	:global(.ag-header-cell-resize) {
		width: var(--spacing-4xs);
	}
	:global(.ag-row.ag-row-last) {
		border-bottom-color: var(--border-color-base);
	}
}

.add-column-popover {
	display: flex;
	position: absolute;
	right: -47px;
}

.footer {
	display: flex;
	width: 100%;
	justify-content: space-between;
	margin-bottom: var(--spacing-l);
	padding-right: var(--spacing-xl);

	:global(.el-pagination__sizes) {
		height: 100%;
		position: relative;
		top: -1px;

		input {
			height: 100%;
			min-height: 28px;
		}

		:global(.el-input__suffix) {
			width: var(--spacing-m);
		}
	}
}
</style>
