<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import type {
	DataStore,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import { AgGridVue } from 'ag-grid-vue3';
import type { GetRowIdParams, GridReadyEvent } from 'ag-grid-community';
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
import { DATA_STORE_HEADER_HEIGHT, DATA_STORE_ROW_HEIGHT } from '@/features/dataStore/constants';
import { useDataStorePagination } from '@/features/dataStore/composables/useDataStorePagination';
import { useDataStoreGridBase } from '@/features/dataStore/composables/useDataStoreGridBase';
import { useDataStoreSelection } from '@/features/dataStore/composables/useDataStoreSelection';
import { useDataStoreOperations } from '@/features/dataStore/composables/useDataStoreOperations';
import { useI18n } from '@n8n/i18n';

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

const gridContainerRef = useTemplateRef<HTMLDivElement>('gridContainerRef');

const i18n = useI18n();

const dataStoreGridBase = useDataStoreGridBase({
	gridContainerRef,
	onDeleteColumn: onDeleteColumnFunction,
	onAddRowClick: onAddRowClickFunction,
	onAddColumn: onAddColumnFunction,
});
const rowData = ref<DataStoreRow[]>([]);
const hasRecords = computed(() => rowData.value.length > 0);

const {
	currentPage,
	pageSize,
	totalItems,
	pageSizeOptions,
	ensureItemOnPage,
	setTotalItems,
	setCurrentPage,
	setPageSize,
} = useDataStorePagination({
	onChange: fetchDataStoreRowsFunction,
});

const selection = useDataStoreSelection({
	gridApi: dataStoreGridBase.gridApi,
});

const dataStoreOperations = useDataStoreOperations({
	colDefs: dataStoreGridBase.colDefs,
	rowData,
	deleteGridColumn: dataStoreGridBase.deleteColumn,
	setGridData: dataStoreGridBase.setGridData,
	insertGridColumnAtIndex: dataStoreGridBase.insertColumnAtIndex,
	dataStoreId: props.dataStore.id,
	projectId: props.dataStore.projectId,
	addGridColumn: dataStoreGridBase.addColumn,
	moveGridColumn: dataStoreGridBase.moveColumn,
	gridApi: dataStoreGridBase.gridApi,
	totalItems,
	setTotalItems,
	ensureItemOnPage,
	focusFirstEditableCell: dataStoreGridBase.focusFirstEditableCell,
	toggleSave: emit.bind(null, 'toggleSave'),
	currentPage,
	pageSize,
	currentSortBy: dataStoreGridBase.currentSortBy,
	currentSortOrder: dataStoreGridBase.currentSortOrder,
	handleClearSelection: selection.handleClearSelection,
	selectedRowIds: selection.selectedRowIds,
	handleCopyFocusedCell: dataStoreGridBase.handleCopyFocusedCell,
});

async function onDeleteColumnFunction(columnId: string) {
	await dataStoreOperations.onDeleteColumn(columnId);
}

async function onAddColumnFunction(column: DataStoreColumnCreatePayload) {
	return await dataStoreOperations.onAddColumn(column);
}

async function onAddRowClickFunction() {
	await dataStoreOperations.onAddRowClick();
}

async function fetchDataStoreRowsFunction() {
	await dataStoreOperations.fetchDataStoreRows();
}

const initialize = async (params: GridReadyEvent) => {
	dataStoreGridBase.onGridReady(params);
	dataStoreGridBase.loadColumns(props.dataStore.columns);
	await dataStoreOperations.fetchDataStoreRows();
};

const customNoRowsOverlay = `<div class="no-rows-overlay ag-overlay-no-rows-center" data-test-id="data-store-no-rows-overlay">${i18n.baseText('dataStore.noRows')}</div>`;

watch([dataStoreGridBase.currentSortBy, dataStoreGridBase.currentSortOrder], async () => {
	await setCurrentPage(1);
});

defineExpose({
	addRow: dataStoreOperations.onAddRowClick,
	addColumn: dataStoreOperations.onAddColumn,
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
				:loading="dataStoreOperations.contentLoading.value"
				:row-selection="selection.rowSelection"
				:get-row-id="(params: GetRowIdParams) => String(params.data.id)"
				:stop-editing-when-cells-lose-focus="true"
				:undo-redo-cell-editing="true"
				:suppress-multi-sort="true"
				:overlay-no-rows-template="customNoRowsOverlay"
				@grid-ready="initialize"
				@cell-value-changed="dataStoreOperations.onCellValueChanged"
				@column-moved="dataStoreOperations.onColumnMoved"
				@cell-clicked="dataStoreGridBase.onCellClicked"
				@cell-editing-started="dataStoreGridBase.onCellEditingStarted"
				@cell-editing-stopped="dataStoreGridBase.onCellEditingStopped"
				@column-header-clicked="dataStoreGridBase.resetLastFocusedCell"
				@selection-changed="selection.onSelectionChanged"
				@sort-changed="dataStoreGridBase.onSortChanged"
				@cell-key-down="dataStoreOperations.onCellKeyDown"
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
			:selected-count="selection.selectedCount.value"
			@delete-selected="dataStoreOperations.handleDeleteSelected"
			@clear-selection="selection.handleClearSelection"
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
	}

	:global(.system-column),
	:global(.system-cell) {
		color: var(--color-text-light);
	}

	:global(.ag-header-cell[col-id='id']) {
		text-align: center;
	}

	:global(.add-row-cell) {
		border: none !important;
		background-color: transparent !important;
		padding: 0;

		button {
			position: relative;
			left: calc(var(--spacing-4xs) * -1);
		}
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
			padding-top: var(--spacing-2xs);

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

	:global(.ag-row-last) {
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

	// A hacky solution for element ui bug where clicking svg inside .more button does not work
	:global(.el-pager .more) {
		background: transparent !important;
		svg {
			z-index: -1;
		}
	}
}
</style>
