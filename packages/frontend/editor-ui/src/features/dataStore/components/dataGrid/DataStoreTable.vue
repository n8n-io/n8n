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
import type {
	GridApi,
	GridReadyEvent,
	ColDef,
	ColumnMovedEvent,
	ValueGetterParams,
	RowSelectionOptions,
	CellValueChangedEvent,
	ICellRendererParams,
} from 'ag-grid-community';
import {
	ModuleRegistry,
	ClientSideRowModelModule,
	TextEditorModule,
	LargeTextEditorModule,
	ColumnAutoSizeModule,
	CheckboxEditorModule,
	NumberEditorModule,
	RowSelectionModule,
	RenderApiModule,
	DateEditorModule,
	ClientSideRowModelApiModule,
	ValidationModule,
	UndoRedoEditModule,
	CellStyleModule,
} from 'ag-grid-community';
import { n8nTheme } from '@/features/dataStore/components/dataGrid/n8nTheme';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import ColumnHeader from '@/features/dataStore/components/dataGrid/ColumnHeader.vue';
import {
	DATA_STORE_ID_COLUMN_WIDTH,
	DEFAULT_ID_COLUMN_NAME,
	NO_TABLE_YET_MESSAGE,
	DATA_STORE_HEADER_HEIGHT,
	DATA_STORE_ROW_HEIGHT,
	ADD_ROW_ROW_ID,
} from '@/features/dataStore/constants';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';
import AddColumnHeaderComponent from '@/features/dataStore/components/dataGrid/AddColumnHeaderComponent.vue';
import AddRowButton from '@/features/dataStore/components/dataGrid/AddRowButton.vue';

// Register only the modules we actually use
ModuleRegistry.registerModules([
	ValidationModule, // This module allows us to see AG Grid errors in browser console
	ClientSideRowModelModule,
	TextEditorModule,
	LargeTextEditorModule,
	ColumnAutoSizeModule,
	CheckboxEditorModule,
	NumberEditorModule,
	RowSelectionModule,
	RenderApiModule,
	DateEditorModule,
	ClientSideRowModelApiModule,
	UndoRedoEditModule,
	CellStyleModule,
]);

type Props = {
	dataStore: DataStore;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	toggleSave: [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const { getDefaultValueForType, mapToAGCellType } = useDataStoreTypes();

const dataStoreStore = useDataStoreStore();

// AG Grid State
const gridApi = ref<GridApi | null>(null);
const colDefs = ref<ColDef[]>([]);
const rowData = ref<DataStoreRow[]>([]);
const rowSelection: RowSelectionOptions | 'single' | 'multiple' = {
	mode: 'singleRow',
	enableClickSelection: true,
	checkboxes: false,
	isRowSelectable: (params) => params.data?.id !== ADD_ROW_ROW_ID,
};

const contentLoading = ref(false);

// Pagination
const pageSizeOptions = [10, 20, 50];
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);

const onGridReady = (params: GridReadyEvent) => {
	gridApi.value = params.api;
};

const refreshGridData = () => {
	if (gridApi.value) {
		gridApi.value.setGridOption('columnDefs', colDefs.value);
		gridApi.value.setGridOption('rowData', [
			...rowData.value,
			{
				id: ADD_ROW_ROW_ID,
			},
		]);
	}
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
	const rowDataOldValue = [...rowData.value];
	rowData.value = rowData.value.map((row) => {
		const { [columnToDelete.field!]: _, ...rest } = row;
		return rest;
	});
	refreshGridData();
	try {
		await dataStoreStore.deleteDataStoreColumn(
			props.dataStore.id,
			props.dataStore.projectId,
			columnId,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.deleteColumn.error'));
		colDefs.value.splice(columnToDeleteIndex, 0, columnToDelete);
		rowData.value = rowDataOldValue;
		refreshGridData();
	}
};

const onAddColumn = async (column: DataStoreColumnCreatePayload) => {
	try {
		// todo: api call should be last
		const newColumn = await dataStoreStore.addDataStoreColumn(
			props.dataStore.id,
			props.dataStore.projectId,
			column,
		);
		if (!newColumn) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		colDefs.value = [
			...colDefs.value.slice(0, -1),
			createColumnDef(newColumn),
			...colDefs.value.slice(-1),
		];
		rowData.value = rowData.value.map((row) => {
			return { ...row, [newColumn.name]: getDefaultValueForType(newColumn.type) };
		});
		refreshGridData();
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addColumn.error'));
	}
};

const createColumnDef = (col: DataStoreColumn, extraProps: Partial<ColDef> = {}) => {
	const columnDef: ColDef = {
		colId: col.id,
		field: col.name,
		headerName: col.name,
		flex: 1,
		editable: true,
		resizable: true,
		lockPinned: true,
		headerComponent: ColumnHeader,
		headerComponentParams: { onDelete: onDeleteColumn },
		cellDataType: mapToAGCellType(col.type),
		valueGetter: (params: ValueGetterParams<DataStoreRow>) => {
			// If the value is null, return null to show empty cell
			if (params.data?.[col.name] === null || params.data?.[col.name] === undefined) {
				return null;
			}
			// Parse dates
			if (col.type === 'date') {
				const value = params.data?.[col.name];
				if (typeof value === 'string') {
					return new Date(value);
				}
			}
			return params.data?.[col.name];
		},
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
	return {
		...columnDef,
		...extraProps,
	};
};

const onColumnMoved = async (moveEvent: ColumnMovedEvent) => {
	if (
		!moveEvent.finished ||
		moveEvent.source !== 'uiColumnMoved' ||
		moveEvent.toIndex === undefined ||
		!moveEvent.column
	) {
		return;
	}

	const oldIndex = colDefs.value.findIndex((col) => col.colId === moveEvent.column!.getColId());
	try {
		await dataStoreStore.moveDataStoreColumn(
			props.dataStore.id,
			props.dataStore.projectId,
			moveEvent.column.getColId(),
			moveEvent.toIndex - 1,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.moveColumn.error'));
		gridApi.value?.moveColumnByIndex(moveEvent.toIndex, oldIndex);
	}
};

const onAddRowClick = async () => {
	try {
		// Go to last page if we are not there already
		if (currentPage.value * pageSize.value < totalItems.value) {
			await setCurrentPage(Math.ceil(totalItems.value / pageSize.value));
		}
		const inserted = await dataStoreStore.insertEmptyRow(props.dataStore);
		if (!inserted) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		emit('toggleSave', true);
		await fetchDataStoreContent();
		refreshGridData();
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addRow.error'));
	} finally {
		emit('toggleSave', false);
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
				minWidth: DATA_STORE_ID_COLUMN_WIDTH,
				maxWidth: DATA_STORE_ID_COLUMN_WIDTH,
				resizable: false,
				cellClass: (params) => (params.data?.id === ADD_ROW_ROW_ID ? 'add-row-cell' : 'id-column'),
				cellRendererSelector: (params: ICellRendererParams) => {
					if (params.value === ADD_ROW_ROW_ID) {
						return {
							component: AddRowButton,
							params: {
								onClick: onAddRowClick,
							},
						};
					}
					return params.value;
				},
			},
		),
		// Append other columns
		...orderBy(props.dataStore.columns, 'index').map((col) => createColumnDef(col)),
		createColumnDef(
			{
				index: props.dataStore.columns.length + 1,
				id: 'add-column',
				name: 'Add Column',
				type: 'string',
			},
			{
				editable: false,
				suppressMovable: true,
				lockPinned: true,
				lockPosition: 'right',
				resizable: false,
				headerComponent: AddColumnHeaderComponent,
				headerComponentParams: { onAddColumn },
			},
		),
	];
};

const onCellValueChanged = async (params: CellValueChangedEvent) => {
	const { data, api } = params;

	try {
		emit('toggleSave', true);
		await dataStoreStore.upsertRow(props.dataStore.id, props.dataStore.projectId, data);
	} catch (error) {
		// Revert cell to original value if the update fails
		api.undoCellEditing();
		toast.showError(error, i18n.baseText('dataStore.updateRow.error'));
	} finally {
		emit('toggleSave', false);
	}
};

const fetchDataStoreContent = async () => {
	try {
		contentLoading.value = true;
		const fetchedRows = await dataStoreStore.fetchDataStoreContent(
			props.dataStore.id,
			props.dataStore.projectId,
			currentPage.value,
			pageSize.value,
		);
		rowData.value = fetchedRows.data;
		totalItems.value = fetchedRows.count;
		refreshGridData();
	} catch (error) {
		// TODO: We currently don't create user tables until user columns or rows are added
		// so we need to ignore NO_TABLE_YET_MESSAGE error here
		if ('message' in error && !error.message.includes(NO_TABLE_YET_MESSAGE)) {
			toast.showError(error, i18n.baseText('dataStore.fetchContent.error'));
		}
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
	refreshGridData();
};

onMounted(async () => {
	await initialize();
});
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style['grid-container']" data-test-id="data-store-grid">
			<AgGridVue
				style="width: 100%"
				:dom-layout="'autoHeight'"
				:row-height="DATA_STORE_ROW_HEIGHT"
				:header-height="DATA_STORE_HEADER_HEIGHT"
				:animate-rows="false"
				:theme="n8nTheme"
				:suppress-drag-leave-hides-columns="true"
				:loading="contentLoading"
				:row-selection="rowSelection"
				:get-row-id="(params) => String(params.data.id)"
				:single-click-edit="true"
				:stop-editing-when-cells-lose-focus="true"
				:undo-redo-cell-editing="true"
				@grid-ready="onGridReady"
				@cell-value-changed="onCellValueChanged"
				@column-moved="onColumnMoved"
			/>
		</div>
		<div :class="$style.footer">
			<el-pagination
				v-model:current-page="currentPage"
				v-model:page-size="pageSize"
				data-test-id="data-store-content-pagination"
				background
				:total="totalItems"
				:page-sizes="pageSizeOptions"
				layout="total, prev, pager, next, sizes"
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
	align-items: center;
}

.grid-container {
	position: relative;
	display: flex;
	width: 100%;

	// AG Grid style overrides
	--ag-foreground-color: var(--color-text-base);
	--ag-cell-text-color: var(--color-text-dark);
	--ag-accent-color: var(--color-secondary);
	--ag-background-color: var(--color-background-xlight);
	--ag-border-color: var(--border-color-base);
	--ag-border-radius: var(--border-radius-base);
	--ag-wrapper-border-radius: 0;
	--ag-font-family: var(--font-family);
	--ag-font-size: var(--font-size-xs);
	--ag-row-height: calc(var(--ag-grid-size) * 0.8 + 32px);
	--ag-header-background-color: var(--color-background-light-base);
	--ag-header-font-size: var(--font-size-xs);
	--ag-header-font-weight: var(--font-weight-bold);
	--ag-header-foreground-color: var(--color-text-dark);
	--ag-cell-horizontal-padding: var(--spacing-2xs);
	--ag-header-height: calc(var(--ag-grid-size) * 0.8 + 32px);
	--ag-header-column-border-height: 100%;

	:global(.ag-cell) {
		display: flex;
		align-items: center;
	}

	:global(.ag-header-cell-resize) {
		width: var(--spacing-xs);
		// this is needed so that we compensate for the width
		right: -7px;
	}

	:global(.ag-root-wrapper) {
		border-left: none;
	}

	:global(.id-column) {
		color: var(--color-text-light);
	}

	:global(.add-row-cell) {
		border: none !important;
		outline: none !important;
	}

	:global(.ag-header-cell[col-id='add-column']) {
		&:after {
			display: none;
		}
	}
}

.footer {
	display: flex;
	width: 100%;
	justify-content: flex-end;
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
