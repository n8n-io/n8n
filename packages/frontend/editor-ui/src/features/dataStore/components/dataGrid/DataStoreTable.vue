<script setup lang="ts">
import { computed, onMounted, ref, nextTick, useTemplateRef } from 'vue';
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
	CellKeyDownEvent,
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
	ScrollApiModule,
} from 'ag-grid-community';
import { n8nTheme } from '@/features/dataStore/components/dataGrid/n8nTheme';
import SelectedItemsInfo from '@/components/common/SelectedItemsInfo.vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import {
	DEFAULT_ID_COLUMN_NAME,
	EMPTY_VALUE,
	NULL_VALUE,
	DATA_STORE_ID_COLUMN_WIDTH,
	DATA_STORE_HEADER_HEIGHT,
	DATA_STORE_ROW_HEIGHT,
	ADD_ROW_ROW_ID,
} from '@/features/dataStore/constants';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import ColumnHeader from '@/features/dataStore/components/dataGrid/ColumnHeader.vue';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';
import AddColumnButton from '@/features/dataStore/components/dataGrid/AddColumnButton.vue';
import AddRowButton from '@/features/dataStore/components/dataGrid/AddRowButton.vue';
import { isDataStoreValue } from '@/features/dataStore/typeGuards';
import NullEmptyCellRenderer from '@/features/dataStore/components/dataGrid/NullEmptyCellRenderer.vue';
import { onClickOutside } from '@vueuse/core';
import { useClipboard } from '@/composables/useClipboard';
import { reorderItem } from '@/features/dataStore/utils';

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
	ScrollApiModule,
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
const { mapToAGCellType } = useDataStoreTypes();

const dataStoreStore = useDataStoreStore();

useClipboard({ onPaste: onClipboardPaste });

// AG Grid State
const gridApi = ref<GridApi | null>(null);
const colDefs = ref<ColDef[]>([]);
const rowData = ref<DataStoreRow[]>([]);
const rowSelection: RowSelectionOptions | 'single' | 'multiple' = {
	mode: 'multiRow',
	enableClickSelection: false,
	checkboxes: (params) => params.data?.id !== ADD_ROW_ROW_ID,
	isRowSelectable: (params) => params.data?.id !== ADD_ROW_ROW_ID,
};

const contentLoading = ref(false);

// Track the last focused cell so we can start editing when users click on it
// AG Grid doesn't provide cell blur event so we need to reset this manually
const lastFocusedCell = ref<{ rowIndex: number; colId: string } | null>(null);
const isTextEditorOpen = ref(false);

const gridContainer = useTemplateRef('gridContainer');

// Pagination
const pageSizeOptions = [10, 20, 50];
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);

// Data store content
const rows = ref<DataStoreRow[]>([]);

const selectedRowIds = ref<Set<number>>(new Set());
const selectedCount = computed(() => selectedRowIds.value.size);

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

const focusFirstEditableCell = (rowId: number) => {
	if (!gridApi.value) return;

	const rowNode = gridApi.value.getRowNode(String(rowId));
	if (rowNode?.rowIndex === null) return;

	const firstEditableCol = colDefs.value[1];
	if (!firstEditableCol?.colId) return;

	gridApi.value.ensureIndexVisible(rowNode!.rowIndex);
	gridApi.value.setFocusedCell(rowNode!.rowIndex, firstEditableCol.colId);
	gridApi.value.startEditingCell({ rowIndex: rowNode!.rowIndex, colKey: firstEditableCol.colId });
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
			return { ...row, [newColumn.name]: null };
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
		sortable: false,
		flex: 1,
		editable: (params) => params.data?.id !== ADD_ROW_ROW_ID,
		resizable: true,
		lockPinned: true,
		headerComponent: ColumnHeader,
		cellEditorPopup: false,
		headerComponentParams: { onDelete: onDeleteColumn },
		cellDataType: mapToAGCellType(col.type),
		cellClass: (params) => {
			if (params.data?.id === ADD_ROW_ROW_ID) {
				return 'add-row-cell';
			}
			if (params.column.getUserProvidedColDef()?.cellDataType === 'boolean') {
				return 'boolean-cell';
			}
			return '';
		},
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
			if (params.data?.id === ADD_ROW_ROW_ID || col.id === 'add-column') {
				return {};
			}
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
			// Rely on the backend to limit the length of the value
			maxLength: 999999999,
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
		columnDef.cellEditorPopup = false;
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
			moveEvent.toIndex - 2, // ag grid index start from 1 and also we need to account for the id column
		);
		// Compute positions within the movable middle section (exclude selection + ID + Add Column)
		const fromIndex = oldIndex - 1; // exclude ID column
		const toIndex = moveEvent.toIndex - 2; // exclude selection + ID columns used by AG Grid indices
		const middleWithIndex = colDefs.value.slice(1, -1).map((col, index) => ({ ...col, index }));
		const reorderedMiddle = reorderItem(middleWithIndex, fromIndex, toIndex)
			.sort((a, b) => a.index - b.index)
			.map(({ index, ...col }) => col);
		colDefs.value = [colDefs.value[0], ...reorderedMiddle, colDefs.value[colDefs.value.length - 1]];
		refreshGridData();
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.moveColumn.error'));
		gridApi.value?.moveColumnByIndex(moveEvent.toIndex, oldIndex);
	}
};

const onAddRowClick = async () => {
	try {
		// Go to last page if we are not there already
		if (currentPage.value * pageSize.value < totalItems.value + 1) {
			await setCurrentPage(Math.ceil((totalItems.value + 1) / pageSize.value));
		}
		contentLoading.value = true;
		emit('toggleSave', true);
		const newRowId = await dataStoreStore.insertEmptyRow(props.dataStore);
		const newRow: DataStoreRow = { id: newRowId };
		// Add nulls for the rest of the columns
		props.dataStore.columns.forEach((col) => {
			newRow[col.name] = null;
		});
		rowData.value.push(newRow);
		totalItems.value += 1;
		refreshGridData();
		await nextTick();
		focusFirstEditableCell(newRowId);
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
					return undefined;
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
				headerComponent: AddColumnButton,
				headerComponentParams: { onAddColumn },
			},
		),
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

	if (
		clickedCellRow === null ||
		params.api.isEditing({ rowIndex: clickedCellRow, column: params.column, rowPinned: null })
	)
		return;

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
		rowData.value = fetchedRows.data;
		totalItems.value = fetchedRows.count;
		refreshGridData();
		handleClearSelection();
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
	gridApi.value?.clearFocusedCell();
});

function onClipboardPaste(data: string) {
	if (!gridApi.value) return;
	const focusedCell = gridApi.value.getFocusedCell();
	const isEditing = gridApi.value.getEditingCells().length > 0;
	if (!focusedCell || isEditing) return;
	const row = gridApi.value.getDisplayedRowAtIndex(focusedCell.rowIndex);
	if (!row) return;

	const colDef = focusedCell.column.getColDef();
	if (colDef.cellDataType === 'text') {
		row.setDataValue(focusedCell.column.getColId(), data);
	} else if (!Number.isNaN(Number(data))) {
		row.setDataValue(focusedCell.column.getColId(), Number(data));
	}
}

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

const onSelectionChanged = () => {
	if (!gridApi.value) return;

	const selectedNodes = gridApi.value.getSelectedNodes();
	const newSelectedIds = new Set<number>();

	selectedNodes.forEach((node) => {
		if (typeof node.data?.id === 'number') {
			newSelectedIds.add(node.data.id);
		}
	});

	selectedRowIds.value = newSelectedIds;
};

const onCellKeyDown = async (params: CellKeyDownEvent<DataStoreRow>) => {
	const key = (params.event as KeyboardEvent).key;
	if (key !== 'Delete' && key !== 'Backspace') return;

	const isEditing = params.api.getEditingCells().length > 0;
	if (isEditing || selectedRowIds.value.size === 0) return;

	params.event?.preventDefault();
	await handleDeleteSelected();
};

const handleDeleteSelected = async () => {
	if (selectedRowIds.value.size === 0) return;

	const confirmResponse = await message.confirm(
		i18n.baseText('dataStore.deleteRows.confirmation', {
			adjustToNumber: selectedRowIds.value.size,
			interpolate: { count: selectedRowIds.value.size },
		}),
		i18n.baseText('dataStore.deleteRows.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (confirmResponse !== MODAL_CONFIRM) {
		return;
	}

	try {
		emit('toggleSave', true);
		const idsToDelete = Array.from(selectedRowIds.value);
		await dataStoreStore.deleteRows(props.dataStore.id, props.dataStore.projectId, idsToDelete);

		rows.value = rows.value.filter((row) => !selectedRowIds.value.has(row.id as number));
		rowData.value = rows.value;

		await fetchDataStoreContent();

		toast.showMessage({
			title: i18n.baseText('dataStore.deleteRows.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.deleteRows.error'));
	} finally {
		emit('toggleSave', false);
	}
};

const handleClearSelection = () => {
	selectedRowIds.value = new Set();
	if (gridApi.value) {
		gridApi.value.deselectAll();
	}
};

defineExpose({
	addRow: onAddRowClick,
	addColumn: onAddColumn,
});
</script>

<template>
	<div :class="$style.wrapper">
		<div ref="gridContainer" :class="$style['grid-container']" data-test-id="data-store-grid">
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
				@selection-changed="onSelectionChanged"
				@cell-key-down="onCellKeyDown"
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
		<SelectedItemsInfo
			:selected-count="selectedCount"
			@delete-selected="handleDeleteSelected"
			@clear-selection="handleClearSelection"
		/>
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
	--ag-accent-color: var(--p-color-secondary-470);
	--ag-row-hover-color: var(--color-background-light-base);
	--ag-background-color: var(--color-background-xlight);
	--ag-border-color: var(--border-color-base);
	--ag-border-radius: var(--border-radius-base);
	--ag-wrapper-border-radius: 0;
	--ag-font-family: var(--font-family);
	--ag-font-size: var(--font-size-xs);
	--ag-font-color: var(--color-text-base);
	--ag-row-height: calc(var(--ag-grid-size) * 0.8 + 32px);
	--ag-header-background-color: var(--color-background-light-base);
	--ag-header-font-size: var(--font-size-xs);
	--ag-header-font-weight: var(--font-weight-medium);
	--ag-header-foreground-color: var(--color-text-dark);
	--ag-cell-horizontal-padding: var(--spacing-2xs);
	--ag-header-height: calc(var(--ag-grid-size) * 0.8 + 32px);
	--ag-header-column-border-height: 100%;
	--ag-range-selection-border-color: var(--p-color-secondary-470);
	--ag-input-padding-start: var(--spacing-2xs);
	--ag-input-background-color: var(--color-text-xlight);
	--ag-focus-shadow: none;

	--cell-editing-border: 2px solid var(--color-secondary);

	:global(.ag-cell) {
		display: flex;
		align-items: center;
	}

	:global(.ag-header-cell-resize) {
		width: var(--spacing-xs);
		// this is needed so that we compensate for the width
		right: -7px;
	}

	:global(.ag-cell[col-id='ag-Grid-SelectionColumn']) {
		border: none;
		padding-left: var(--spacing-l);
	}

	:global(.ag-header-cell[col-id='ag-Grid-SelectionColumn']) {
		padding-left: var(--spacing-l);
		&:after {
			display: none;
		}
	}

	:global(.ag-cell[col-id='ag-Grid-SelectionColumn'].ag-cell-focus) {
		outline: none;
	}

	:global(.ag-root-wrapper) {
		border-left: none;
	}

	:global(.id-column) {
		color: var(--color-text-light);
		justify-content: center;
	}

	:global(.ag-header-cell[col-id='id']) {
		text-align: center;
	}

	:global(.add-row-cell) {
		border: none !important;
		background-color: transparent !important;
	}

	:global(.ag-header-cell[col-id='add-column']) {
		&:after {
			display: none;
		}
	}

	:global(.ag-cell-value[col-id='add-column']),
	:global(.ag-cell-value[col-id='id']),
	:global(.ag-cell[col-id='ag-Grid-SelectionColumn']) {
		border: none;
		background-color: transparent;
	}

	:global(.ag-cell-value[col-id='id']) {
		border-right: 1px solid var(--ag-border-color);
	}

	:global(.ag-large-text-input) {
		position: fixed;
		padding: 0;

		textarea {
			padding-top: var(--spacing-xs);

			&:where(:focus-within, :active) {
				border: var(--cell-editing-border);
			}
		}
	}

	:global(.ag-center-cols-viewport) {
		min-height: auto;
	}

	:global(.ag-checkbox-input-wrapper) {
		&:where(:focus-within, :active) {
			box-shadow: none;
		}
	}

	:global(.ag-cell-inline-editing) {
		box-shadow: none;

		&:global(.boolean-cell) {
			border: var(--cell-editing-border) !important;

			&:global(.ag-cell-focus) {
				background-color: var(--grid-cell-active-background);
			}
		}
	}

	:global(.ag-cell-focus) {
		background-color: var(--grid-row-selected-background);
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
