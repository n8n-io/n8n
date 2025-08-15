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
} from 'ag-grid-community';
import { n8nTheme } from '@/features/dataStore/components/dataGrid/n8nTheme';
import AddColumnPopover from '@/features/dataStore/components/dataGrid/AddColumnPopover.vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
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

const i18n = useI18n();
const toast = useToast();
const message = useMessage();

const dataStoreStore = useDataStoreStore();

// AG Grid State
const gridApi = ref<GridApi | null>(null);
const colDefs = ref<ColDef[]>([]);
const rowData = ref<DataStoreRow[]>([]);

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

const onGridReady = (params: GridReadyEvent) => {
	gridApi.value = params.api;
};

const setCurrentPage = async (page: number) => {
	currentPage.value = page;
	// await fetchData();
};

const setPageSize = (size: number) => {
	pageSize.value = size;
	currentPage.value = 1; // Reset to first page on page size change
	// await fetchData();
};

const onDeleteColumn = async (columnId: string) => {
	// TODO: how can we skip doing this in all handlers?
	if (!gridApi.value) return;

	const columnToDelete = colDefs.value.find((col) => col.colId === columnId);
	if (!columnToDelete) return;

	const promptResponse = await message.confirm(
		i18n.baseText('dataStore.deleteColumn.confirm.message', {
			interpolate: { name: columnToDelete.headerName ?? '' },
		}),
		i18n.baseText('dataStore.deleteColumn.confirm.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (promptResponse !== MODAL_CONFIRM) {
		return;
	}

	const columnToDeleteIndex = colDefs.value.findIndex((col) => col.colId === columnId);
	colDefs.value = colDefs.value.filter((def) => def.colId !== columnId);
	rowData.value = rowData.value.map((row) => {
		const { [columnToDelete.field!]: _, ...rest } = row;
		return rest;
	});
	if (gridApi.value) {
		gridApi.value.setGridOption('columnDefs', colDefs.value);
		gridApi.value.setGridOption('rowData', rowData.value);
	}
	try {
		await dataStoreStore.deleteDataStoreColumn(props.dataStore.id, columnId);
	} catch (error: unknown) {
		toast.showError(error as Error, i18n.baseText('dataStore.deleteColumn.error'));
		colDefs.value.splice(columnToDeleteIndex, 0, columnToDelete);
	}
};

const onAddColumn = async ({ column }: { column: DataStoreColumnCreatePayload }) => {
	// TODO:
	// - Add loading
	try {
		const newColumn = await dataStoreStore.addDataStoreColumn(props.dataStore.id, column);
		if (!newColumn) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		colDefs.value.push(createColumnDef(newColumn));
		rowData.value = rowData.value.map((row) => {
			return { ...row, [newColumn.name]: getDefaultValueForType(newColumn.type) };
		});
		if (gridApi.value) {
			gridApi.value.setGridOption('columnDefs', colDefs.value);
			gridApi.value.setGridOption('rowData', rowData.value);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addColumn.error'));
	}
};

const createColumnDef = (col: DataStoreColumn, extraProps: Partial<ColDef> = {}) => {
	const columnDef: ColDef = {
		colId: col.id,
		field: col.name,
		headerName: col.name,
		editable: true,
		resizable: true,
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
		...extraProps,
	};
	// Enable large text editor for text columns
	if (col.type === 'string') {
		columnDef.cellEditor = 'agLargeTextCellEditor';
		columnDef.cellEditorPopup = true;
	}
	return columnDef;
};

const onColumnMoved = async (moveEvent: ColumnMovedEvent) => {
	if (
		!moveEvent.finished ||
		moveEvent.source !== 'uiColumnMoved' ||
		!moveEvent.toIndex ||
		!moveEvent.column
	) {
		return;
	}

	const oldIndex = colDefs.value.findIndex((col) => col.colId === moveEvent.column!.getColId());
	try {
		await dataStoreStore.moveDataStoreColumn(
			props.dataStore.id,
			moveEvent.column.getColId(),
			moveEvent.toIndex - 1,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.moveColumn.error'));
		gridApi.value?.moveColumnByIndex(moveEvent.toIndex, oldIndex);
	}
};

const initColumnDefinitions = () => {
	colDefs.value = [
		// Always add the ID column, it's not returned by the back-end but all data stores have it
		// We use it as a placeholder for new datastores
		createColumnDef(
			{
				index: 0,
				id: DEFAULT_ID_COLUMN_NAME,
				name: DEFAULT_ID_COLUMN_NAME,
				type: 'string',
			},
			{
				editable: false,
				suppressMovable: true,
				headerComponent: null,
				lockPosition: true,
			},
		),
		// Append other columns
		...orderBy(props.dataStore.columns, 'index').map((col) => createColumnDef(col)),
	];
};

const initialize = async () => {
	initColumnDefinitions();
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
				:row-height="36"
				:header-height="36"
				:animate-rows="false"
				:theme="n8nTheme"
				:loading="contentLoading"
				:suppress-drag-leave-hides-columns="true"
				@grid-ready="onGridReady"
				@column-moved="onColumnMoved"
			/>
			<AddColumnPopover
				:data-store="props.dataStore"
				:class="$style['add-column-popover']"
				@add-column="onAddColumn"
			/>
		</div>
		<div :class="$style.footer">
			<n8n-icon-button icon="plus" class="mb-xl" type="secondary" />
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
	--ag-cell-horizontal-padding: var(--spacing-2xs);
	--ag-header-column-resize-handle-color: var(--border-color-base);
	--ag-header-column-resize-handle-height: 100%;
	--ag-header-height: calc(var(--ag-grid-size) * 0.8 + 32px);

	:global(.ag-header-cell-resize) {
		width: var(--spacing-4xs);
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
