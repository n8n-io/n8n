<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue';
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
	GetRowIdParams,
	ICellRendererParams,
	CellEditRequestEvent,
	CellClickedEvent,
	ValueSetterParams,
	CellEditingStartedEvent,
	CellEditingStoppedEvent,
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
} from 'ag-grid-community';
import { n8nTheme } from '@/features/dataStore/components/dataGrid/n8nTheme';
import AddColumnPopover from '@/features/dataStore/components/dataGrid/AddColumnPopover.vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { DEFAULT_ID_COLUMN_NAME, EMPTY_VALUE, NULL_VALUE } from '@/features/dataStore/constants';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import ColumnHeader from '@/features/dataStore/components/dataGrid/ColumnHeader.vue';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';
import { isDataStoreValue } from '@/features/dataStore/typeGuards';
import NullEmptyCellRenderer from '@/features/dataStore/components/dataGrid/NullEmptyCellRenderer.vue';
import { onClickOutside } from '@vueuse/core';

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
const dataStoreTypes = useDataStoreTypes();

const dataStoreStore = useDataStoreStore();

// AG Grid State
const gridApi = ref<GridApi | null>(null);
const colDefs = ref<ColDef[]>([]);
const rowData = ref<DataStoreRow[]>([]);
const rowSelection: RowSelectionOptions | 'single' | 'multiple' = {
	mode: 'multiRow',
	enableClickSelection: false,
	checkboxes: true,
};

const contentLoading = ref(false);

// Track the last focused cell so we can start editing when users click on it
// AG Grid doesn't provide cell blur event so we need to reset this manually
const lastFocusedCell = ref<{ rowIndex: number; colId: string } | null>(null);
const isTextEditorOpen = ref(false);

const gridContainer = useTemplateRef('gridContainer');

// Shared config for all columns
const defaultColumnDef: ColDef = {
	flex: 1,
	sortable: false,
	filter: false,
};

// Pagination
const pageSizeOptions = [10, 20, 50];
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);

// Data store content
const rows = ref<DataStoreRow[]>([]);

const onGridReady = (params: GridReadyEvent) => {
	gridApi.value = params.api;
};

const refreshGridData = () => {
	if (gridApi.value) {
		gridApi.value.setGridOption('columnDefs', colDefs.value);
		gridApi.value.setGridOption('rowData', rowData.value);
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

const onAddColumn = async ({ column }: { column: DataStoreColumnCreatePayload }) => {
	try {
		const newColumn = await dataStoreStore.addDataStoreColumn(
			props.dataStore.id,
			props.dataStore.projectId,
			column,
		);
		if (!newColumn) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		colDefs.value = [...colDefs.value, createColumnDef(newColumn)];
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addColumn.error'));
	}
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
		const { [columnToDelete.field ?? '']: _, ...rest } = row;
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

// TODO: Split this up to create column def based on type
const createColumnDef = (col: DataStoreColumn, extraProps: Partial<ColDef> = {}) => {
	const columnDef: ColDef = {
		colId: col.id,
		field: col.name,
		headerName: col.name,
		editable: true,
		resizable: true,
		headerComponent: ColumnHeader,
		cellEditorPopup: false,
		headerComponentParams: { onDelete: onDeleteColumn },
		...extraProps,
		cellDataType: dataStoreTypes.mapToAGCellType(col.type),
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
		cellRendererSelector: (params: ICellRendererParams) => {
			let rowValue = params.data?.[col.name];
			// When adding new column, rowValue is undefined (same below, in string cell editor)
			if (rowValue === undefined) {
				rowValue = null;
			}

			// Custom renderer for null or empty values
			if (rowValue === null) {
				return { component: NullEmptyCellRenderer, params: { value: NULL_VALUE } };
			}
			if (rowValue === '') {
				return { component: NullEmptyCellRenderer, params: { value: EMPTY_VALUE } };
			}
			// Fallback to default cell renderer
			return undefined;
		},
	};
	// Enable large text editor for text columns
	if (col.type === 'string') {
		columnDef.cellEditor = 'agLargeTextCellEditor';
		// Provide initial value for the editor, otherwise agLargeTextCellEditor breaks
		columnDef.cellEditorParams = (params: CellEditRequestEvent<DataStoreRow>) => ({
			value: params.value ?? '',
		});
		columnDef.valueSetter = (params: ValueSetterParams<DataStoreRow>) => {
			let originalValue = params.data[col.name];
			if (originalValue === undefined) {
				originalValue = null;
			}
			let newValue = params.newValue;

			if (!isDataStoreValue(newValue)) {
				return false;
			}

			// Make sure not to trigger update if cell content is not set and value was null
			if (originalValue === null && newValue === '') {
				return false;
			}

			// When clearing editor content, set value to empty string
			if (isTextEditorOpen.value && newValue === null) {
				newValue = '';
			}

			// Otherwise update the value
			params.data[col.name] = newValue;
			return true;
		};
	}
	// Setup date editor
	if (col.type === 'date') {
		columnDef.cellEditor = 'agDateCellEditor';
		columnDef.cellEditorPopup = true;
	}
	return columnDef;
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
		contentLoading.value = true;
		emit('toggleSave', true);
		const newRowId = await dataStoreStore.insertEmptyRow(props.dataStore);
		const newRow: DataStoreRow = { id: newRowId };
		// Add nulls for the rest of the columns
		props.dataStore.columns.forEach((col) => {
			newRow[col.name] = null;
		});
		rows.value.push(newRow);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addRow.error'));
	} finally {
		emit('toggleSave', false);
		contentLoading.value = false;
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

const onCellValueChanged = async (params: CellValueChangedEvent<DataStoreRow>) => {
	const { data, api, oldValue, colDef } = params;
	const value = params.data[colDef.field!];

	if (value === undefined || value === oldValue) {
		return;
	}

	if (typeof data.id !== 'number') {
		throw new Error('Expected row id to be a number');
	}
	const fieldName = String(colDef.field);
	const id = data.id;

	try {
		emit('toggleSave', true);
		await dataStoreStore.updateRow(props.dataStore.id, props.dataStore.projectId, id, {
			[fieldName]: value,
		});
	} catch (error) {
		// Revert cell to original value if the update fails
		const validOldValue = isDataStoreValue(oldValue) ? oldValue : null;
		const revertedData: DataStoreRow = { ...data, [fieldName]: validOldValue };
		api.applyTransaction({
			update: [revertedData],
		});
		toast.showError(error, i18n.baseText('dataStore.updateRow.error'));
	} finally {
		emit('toggleSave', false);
	}
};

// Start editing when users click on already focused cells
const onCellClicked = (params: CellClickedEvent<DataStoreRow>) => {
	const clickedCellColumn = params.column.getColId();
	const clickedCellRow = params.rowIndex;

	// Skip if rowIndex is null
	if (clickedCellRow === null) return;

	// Check if this is the same cell that was focused before this click
	const wasAlreadyFocused =
		lastFocusedCell.value &&
		lastFocusedCell.value.rowIndex === clickedCellRow &&
		lastFocusedCell.value.colId === clickedCellColumn;

	if (wasAlreadyFocused && params.column.getColDef()?.editable) {
		// Cell was already selected, start editing
		params.api.startEditingCell({
			rowIndex: clickedCellRow,
			colKey: clickedCellColumn,
		});
	}

	// Update the last focused cell for next click
	lastFocusedCell.value = {
		rowIndex: clickedCellRow,
		colId: clickedCellColumn,
	};
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

onClickOutside(gridContainer, () => {
	resetLastFocusedCell();
});

const resetLastFocusedCell = () => {
	lastFocusedCell.value = null;
};

const initialize = async () => {
	initColumnDefinitions();
	await fetchDataStoreContent();
};

onMounted(async () => {
	await initialize();
});

const onCellEditingStarted = (params: CellEditingStartedEvent<DataStoreRow>) => {
	if (params.column.getColDef().cellDataType === 'text') {
		isTextEditorOpen.value = true;
	} else {
		isTextEditorOpen.value = false;
	}
};

const onCellEditingStopped = (params: CellEditingStoppedEvent<DataStoreRow>) => {
	if (params.column.getColDef().cellDataType === 'text') {
		isTextEditorOpen.value = false;
	}
};
</script>

<template>
	<div :class="$style.wrapper">
		<div ref="gridContainer" :class="$style['grid-container']" data-test-id="data-store-grid">
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
				:suppress-drag-leave-hides-columns="true"
				:loading="contentLoading"
				:row-selection="rowSelection"
				:get-row-id="(params: GetRowIdParams) => String(params.data.id)"
				:stop-editing-when-cells-lose-focus="true"
				:undo-redo-cell-editing="true"
				@grid-ready="onGridReady"
				@cell-value-changed="onCellValueChanged"
				@column-moved="onColumnMoved"
				@cell-clicked="onCellClicked"
				@cell-editing-started="onCellEditingStarted"
				@cell-editing-stopped="onCellEditingStopped"
				@column-header-clicked="resetLastFocusedCell"
				@selection-changed="resetLastFocusedCell"
			/>
			<AddColumnPopover
				:data-store="props.dataStore"
				:class="$style['add-column-popover']"
				@add-column="onAddColumn"
			/>
		</div>
		<div :class="$style.footer">
			<n8n-tooltip :content="i18n.baseText('dataStore.addRow.label')">
				<n8n-icon-button
					data-test-id="data-store-add-row-button"
					icon="plus"
					class="mb-xl"
					type="secondary"
					@click="onAddRowClick"
				/>
			</n8n-tooltip>
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

	// Don't show borders for the checkbox cells
	:global(.ag-cell[col-id='ag-Grid-SelectionColumn']) {
		border: none;
	}

	:global(.ag-cell[col-id='ag-Grid-SelectionColumn'].ag-cell-focus) {
		outline: none;
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
