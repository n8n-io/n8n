<script setup lang="ts">
import { computed, onMounted, ref, nextTick, useTemplateRef } from 'vue';
import type {
	DataStore,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import { AgGridVue } from 'ag-grid-vue3';
import type {
	ColumnMovedEvent,
	CellValueChangedEvent,
	GetRowIdParams,
	CellClickedEvent,
	CellKeyDownEvent,
	SortDirection,
	SortChangedEvent,
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
	PinnedRowModule,
	ColumnApiModule,
} from 'ag-grid-community';
import { n8nTheme } from '@/features/dataStore/components/dataGrid/n8nTheme';
import SelectedItemsInfo from '@/components/common/SelectedItemsInfo.vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import {
	DEFAULT_ID_COLUMN_NAME,
	DATA_STORE_HEADER_HEIGHT,
	DATA_STORE_ROW_HEIGHT,
} from '@/features/dataStore/constants';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import { useDataStorePagination } from '@/features/dataStore/composables/useDataStorePagination';
import { isDataStoreValue } from '@/features/dataStore/typeGuards';
import { onClickOutside } from '@vueuse/core';
import { useClipboard } from '@/composables/useClipboard';
import { useDataStoreGridBase } from '@/features/dataStore/composables/useDataStoreGridBase';
import { useDataStoreSelection } from '@/features/dataStore/composables/useDataStoreSelection';

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
	PinnedRowModule,
	ScrollApiModule,
	ColumnApiModule,
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

const dataStoreStore = useDataStoreStore();

const { copy: copyToClipboard } = useClipboard({ onPaste: onClipboardPaste });

const gridContainerRef = useTemplateRef<HTMLDivElement>('gridContainerRef');

// AG Grid State
const {
	gridApi,
	onGridReady,
	setGridData,
	focusFirstEditableCell,
	onCellEditingStarted,
	onCellEditingStopped,
	loadColumns,
	colDefs,
	deleteColumn: deleteGridColumn,
	insertColumn: insertGridColumn,
	addColumn: addGridColumn,
	moveColumn: moveGridColumn,
} = useDataStoreGridBase({
	gridContainerRef,
	onDeleteColumn,
	onAddRowClick,
	onAddColumn,
});
const rowData = ref<DataStoreRow[]>([]);

const currentSortBy = ref<string>(DEFAULT_ID_COLUMN_NAME);
const currentSortOrder = ref<SortDirection>('asc');
const contentLoading = ref(false);

// Track the last focused cell so we can start editing when users click on it
// AG Grid doesn't provide cell blur event so we need to reset this manually
const lastFocusedCell = ref<{ rowIndex: number; colId: string } | null>(null);

// Pagination
const {
	currentPage,
	pageSize,
	pageSizeOptions,
	totalItems,
	setTotalItems,
	setCurrentPage,
	setPageSize,
	ensureItemOnPage,
} = useDataStorePagination({ onChange: fetchDataStoreContent });

// Data store content
const rows = ref<DataStoreRow[]>([]);
const { rowSelection, onSelectionChanged, handleClearSelection, selectedRowIds, selectedCount } =
	useDataStoreSelection({
		gridApi,
	});

const hasRecords = computed(() => rowData.value.length > 0);

async function onDeleteColumn(columnId: string) {
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
	deleteGridColumn(columnId);
	const rowDataOldValue = [...rowData.value];
	rowData.value = rowData.value.map((row) => {
		const { [columnToDelete.field!]: _, ...rest } = row;
		return rest;
	});
	setGridData({ rowData: rowData.value });
	try {
		await dataStoreStore.deleteDataStoreColumn(
			props.dataStore.id,
			props.dataStore.projectId,
			columnId,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.deleteColumn.error'));
		insertGridColumn(columnToDelete, columnToDeleteIndex);
		rowData.value = rowDataOldValue;
		setGridData({ rowData: rowData.value });
	}
}

async function onAddColumn(column: DataStoreColumnCreatePayload) {
	try {
		const newColumn = await dataStoreStore.addDataStoreColumn(
			props.dataStore.id,
			props.dataStore.projectId,
			column,
		);
		if (!newColumn) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		addGridColumn(newColumn);
		rowData.value = rowData.value.map((row) => {
			return { ...row, [newColumn.name]: null };
		});
		setGridData({ rowData: rowData.value });
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addColumn.error'));
		return false;
	}
}

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
	const newIndex = moveEvent.toIndex - 2; // selection and id columns are included here
	try {
		await dataStoreStore.moveDataStoreColumn(
			props.dataStore.id,
			props.dataStore.projectId,
			moveEvent.column.getColId(),
			newIndex,
		);
		moveGridColumn(oldIndex, newIndex);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.moveColumn.error'));
		gridApi.value.moveColumnByIndex(moveEvent.toIndex, oldIndex + 1);
	}
};

async function onAddRowClick() {
	try {
		await ensureItemOnPage(totalItems.value + 1);

		contentLoading.value = true;
		emit('toggleSave', true);
		const insertedRow = await dataStoreStore.insertEmptyRow(props.dataStore);
		const newRow: DataStoreRow = insertedRow;
		rowData.value.push(newRow);
		setTotalItems(totalItems.value + 1);
		setGridData({ rowData: rowData.value });
		await nextTick();
		focusFirstEditableCell(newRow.id as number);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addRow.error'));
	} finally {
		emit('toggleSave', false);
		contentLoading.value = false;
	}
}

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

async function fetchDataStoreContent() {
	try {
		contentLoading.value = true;

		const fetchedRows = await dataStoreStore.fetchDataStoreContent(
			props.dataStore.id,
			props.dataStore.projectId,
			currentPage.value,
			pageSize.value,
			`${currentSortBy.value}:${currentSortOrder.value}`,
		);
		rowData.value = fetchedRows.data;
		setTotalItems(fetchedRows.count);
		setGridData({ rowData: rowData.value, colDefs: colDefs.value });
		handleClearSelection();
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.fetchContent.error'));
	} finally {
		contentLoading.value = false;
	}
}

onClickOutside(gridContainerRef, () => {
	resetLastFocusedCell();
	gridApi.value.clearFocusedCell();
});

function onClipboardPaste(data: string) {
	const focusedCell = gridApi.value.getFocusedCell();
	const isEditing = gridApi.value.getEditingCells().length > 0;
	if (!focusedCell || isEditing) return;
	const row = gridApi.value.getDisplayedRowAtIndex(focusedCell.rowIndex);
	if (!row) return;

	const colDef = focusedCell.column.getColDef();
	if (colDef.cellDataType === 'text') {
		row.setDataValue(focusedCell.column.getColId(), data);
	} else if (colDef.cellDataType === 'number') {
		if (!Number.isNaN(Number(data))) {
			row.setDataValue(focusedCell.column.getColId(), Number(data));
		}
	} else if (colDef.cellDataType === 'date') {
		if (!Number.isNaN(Date.parse(data))) {
			row.setDataValue(focusedCell.column.getColId(), new Date(data));
		}
	} else if (colDef.cellDataType === 'boolean') {
		if (data === 'true') {
			row.setDataValue(focusedCell.column.getColId(), true);
		} else if (data === 'false') {
			row.setDataValue(focusedCell.column.getColId(), false);
		}
	}
}

const resetLastFocusedCell = () => {
	lastFocusedCell.value = null;
};

const initialize = async () => {
	loadColumns(props.dataStore.columns);
	await fetchDataStoreContent();
};

const onSortChanged = async (event: SortChangedEvent) => {
	const oldSortBy = currentSortBy.value;
	const oldSortOrder = currentSortOrder.value;

	const sortedColumn = event.columns?.filter((col) => col.getSort() !== null).pop() ?? null;

	if (sortedColumn) {
		const colId = sortedColumn.getColId();
		const columnDef = colDefs.value.find((col) => col.colId === colId);

		currentSortBy.value = columnDef?.field || colId;
		currentSortOrder.value = sortedColumn.getSort() ?? 'asc';
	} else {
		currentSortBy.value = DEFAULT_ID_COLUMN_NAME;
		currentSortOrder.value = 'asc';
	}

	if (oldSortBy !== currentSortBy.value || oldSortOrder !== currentSortOrder.value) {
		await setCurrentPage(1);
	}
};

onMounted(async () => {
	await initialize();
});

const onCellKeyDown = async (params: CellKeyDownEvent<DataStoreRow>) => {
	if (params.api.getEditingCells().length > 0) {
		return;
	}

	const event = params.event as KeyboardEvent;
	if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
		event.preventDefault();
		await handleCopyFocusedCell(params);
		return;
	}

	if ((event.key !== 'Delete' && event.key !== 'Backspace') || selectedRowIds.value.size === 0) {
		return;
	}
	event.preventDefault();
	await handleDeleteSelected();
};

const handleCopyFocusedCell = async (params: CellKeyDownEvent<DataStoreRow>) => {
	const focused = params.api.getFocusedCell();
	if (!focused) {
		return;
	}
	const row = params.api.getDisplayedRowAtIndex(focused.rowIndex);
	const colDef = focused.column.getColDef();
	if (row?.data && colDef.field) {
		const rawValue = row.data[colDef.field];
		const text = rawValue === null || rawValue === undefined ? '' : String(rawValue);
		await copyToClipboard(text);
	}
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

		toast.showToast({
			title: i18n.baseText('dataStore.deleteRows.success'),
			message: '',
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.deleteRows.error'));
	} finally {
		emit('toggleSave', false);
	}
};

defineExpose({
	addRow: onAddRowClick,
	addColumn: onAddColumn,
});
</script>

<template>
	<div :class="$style.wrapper">
		<div
			ref="gridContainerRef"
			:class="[$style['grid-container'], { [$style['has-records']]: hasRecords }]"
			data-test-id="data-store-grid"
		>
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
				:suppress-multi-sort="true"
				@grid-ready="onGridReady"
				@cell-value-changed="onCellValueChanged"
				@column-moved="onColumnMoved"
				@cell-clicked="onCellClicked"
				@cell-editing-started="onCellEditingStarted"
				@cell-editing-stopped="onCellEditingStopped"
				@column-header-clicked="resetLastFocusedCell"
				@selection-changed="onSelectionChanged"
				@sort-changed="onSortChanged"
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
		position: absolute;
		min-width: 420px;
		padding: 0;

		textarea {
			padding-top: var(--spacing-xs);

			&:where(:focus-within, :active) {
				border: var(--grid-cell-editing-border);
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
			border: var(--grid-cell-editing-border) !important;

			&:global(.ag-cell-focus) {
				background-color: var(--grid-cell-active-background);
			}
		}
	}

	:global(.ag-cell-focus) {
		background-color: var(--grid-row-selected-background);
	}

	&.has-records {
		:global(.ag-floating-bottom) {
			border-top: var(--border-width-base) var(--border-style-base) var(--ag-border-color);
		}
	}

	:global(.ag-row[row-id='__n8n_add_row__']) {
		border-bottom: none;
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
