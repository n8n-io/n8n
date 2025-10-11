<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import type {
	DataTable,
	DataTableColumnCreatePayload,
	DataTableRow,
} from '@/features/dataTable/dataTable.types';
import { AgGridVue } from 'ag-grid-vue3';
import type { GetRowIdParams, GridReadyEvent, SortChangedEvent } from 'ag-grid-community';
import { n8nTheme } from '@/features/dataTable/components/dataGrid/n8nTheme';
import { registerAgGridModulesOnce } from '@/features/dataTable/components/dataGrid/registerAgGridModulesOnce';
import SelectedItemsInfo from '@/components/common/SelectedItemsInfo.vue';
import {
	DATA_TABLE_HEADER_HEIGHT,
	DATA_TABLE_ROW_HEIGHT,
	DEFAULT_ID_COLUMN_NAME,
	ADD_ROW_ROW_ID,
} from '@/features/dataTable/constants';
import { useDataTablePagination } from '@/features/dataTable/composables/useDataTablePagination';
import { useAgGrid } from '@/features/dataTable/composables/useAgGrid';
import { useDataTableColumns } from '@/features/dataTable/composables/useDataTableColumns';
import { useDataTableSelection } from '@/features/dataTable/composables/useDataTableSelection';
import { useDataTableOperations } from '@/features/dataTable/composables/useDataTableOperations';
import { useDataTableColumnFilters } from '@/features/dataTable/composables/useDataTableColumnFilters';
import { useI18n } from '@n8n/i18n';
import { GRID_FILTER_CONFIG } from '@/features/dataTable/utils/filterMappings';

import { ElPagination } from 'element-plus';
registerAgGridModulesOnce();

type Props = {
	dataTable: DataTable;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	toggleSave: [value: boolean];
}>();

const gridContainerRef = useTemplateRef<HTMLDivElement>('gridContainerRef');

const i18n = useI18n();
const rowData = ref<DataTableRow[]>([]);
const hasRecords = computed(() => rowData.value.length > 0);

const agGrid = useAgGrid<DataTableRow>({
	gridContainerRef,
	defaultSortColumn: DEFAULT_ID_COLUMN_NAME,
	pinnedBottomRowId: ADD_ROW_ROW_ID,
	defaultColDef: GRID_FILTER_CONFIG.defaultColDef,
});

const dataTableColumns = useDataTableColumns({
	onDeleteColumn: onDeleteColumnFunction,
	onAddRowClick: onAddRowClickFunction,
	onAddColumn: onAddColumnFunction,
	isTextEditorOpen: agGrid.isTextEditorOpen,
});

const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
	gridApi: agGrid.gridApi,
	colDefs: dataTableColumns.colDefs,
});

const {
	currentPage,
	pageSize,
	totalItems,
	pageSizeOptions,
	ensureItemOnPage,
	setTotalItems,
	setCurrentPage,
	setPageSize,
} = useDataTablePagination({ onChange: fetchDataTableRowsFunction });

const selection = useDataTableSelection({
	gridApi: agGrid.gridApi,
});

const dataTableOperations = useDataTableOperations({
	colDefs: dataTableColumns.colDefs,
	rowData,
	deleteGridColumn: dataTableColumns.deleteColumn,
	setGridData: agGrid.setGridData,
	insertGridColumnAtIndex: dataTableColumns.insertColumnAtIndex,
	dataTableId: props.dataTable.id,
	projectId: props.dataTable.projectId,
	addGridColumn: dataTableColumns.addColumn,
	moveGridColumn: dataTableColumns.moveColumn,
	gridApi: agGrid.gridApi,
	totalItems,
	setTotalItems,
	ensureItemOnPage,
	focusFirstEditableCell: agGrid.focusFirstEditableCell,
	toggleSave: emit.bind(null, 'toggleSave'),
	currentPage,
	pageSize,
	currentSortBy: agGrid.currentSortBy,
	currentSortOrder: agGrid.currentSortOrder,
	handleClearSelection: selection.handleClearSelection,
	selectedRowIds: selection.selectedRowIds,
	handleCopyFocusedCell: agGrid.handleCopyFocusedCell,
	currentFilterJSON,
});

async function onDeleteColumnFunction(columnId: string) {
	await dataTableOperations.onDeleteColumn(columnId);
}

async function onAddColumnFunction(column: DataTableColumnCreatePayload) {
	return await dataTableOperations.onAddColumn(column);
}

async function onAddRowClickFunction() {
	await dataTableOperations.onAddRowClick();
}

async function fetchDataTableRowsFunction() {
	await dataTableOperations.fetchDataTableRows();
}

const initialize = async (params: GridReadyEvent) => {
	agGrid.onGridReady(params);
	dataTableColumns.loadColumns(props.dataTable.columns);
	agGrid.setGridData({ colDefs: dataTableColumns.colDefs.value });
	await dataTableOperations.fetchDataTableRows();
};

const customNoRowsOverlay = `<div class="no-rows-overlay ag-overlay-no-rows-center" data-test-id="data-table-no-rows-overlay">${i18n.baseText('dataTable.noRows')}</div>`;

watch([agGrid.currentSortBy, agGrid.currentSortOrder], async () => {
	await setCurrentPage(1);
});

watch(currentFilterJSON, async () => {
	await setCurrentPage(1);
});

defineExpose({
	addRow: dataTableOperations.onAddRowClick,
	addColumn: dataTableOperations.onAddColumn,
});
</script>

<template>
	<div :class="$style.wrapper">
		<div
			ref="gridContainerRef"
			:class="[$style['grid-container'], { [$style['has-records']]: hasRecords }]"
			data-test-id="data-table-grid"
		>
			<AgGridVue
				style="width: 100%"
				:dom-layout="'autoHeight'"
				:row-height="DATA_TABLE_ROW_HEIGHT"
				:header-height="DATA_TABLE_HEADER_HEIGHT"
				:animate-rows="false"
				:theme="n8nTheme"
				:suppress-drag-leave-hides-columns="true"
				:loading="dataTableOperations.contentLoading.value"
				:row-selection="selection.rowSelection"
				:get-row-id="(params: GetRowIdParams) => String(params.data.id)"
				:stop-editing-when-cells-lose-focus="true"
				:undo-redo-cell-editing="true"
				:suppress-multi-sort="true"
				:overlay-no-rows-template="customNoRowsOverlay"
				@grid-ready="initialize"
				@cell-value-changed="dataTableOperations.onCellValueChanged"
				@column-moved="dataTableOperations.onColumnMoved"
				@cell-clicked="agGrid.onCellClicked"
				@cell-editing-started="agGrid.onCellEditingStarted"
				@cell-editing-stopped="agGrid.onCellEditingStopped"
				@column-header-clicked="agGrid.resetLastFocusedCell"
				@selection-changed="selection.onSelectionChanged"
				@sort-changed="
					(e: SortChangedEvent) => agGrid.onSortChanged(e, dataTableColumns.colDefs.value)
				"
				@cell-key-down="dataTableOperations.onCellKeyDown"
				@filter-changed="onFilterChanged"
			/>
			<div :class="$style.footer">
				<ElPagination
					v-model:current-page="currentPage"
					v-model:page-size="pageSize"
					data-test-id="data-table-content-pagination"
					background
					:total="totalItems"
					:page-sizes="pageSizeOptions"
					layout="total, prev, pager, next, sizes"
					@update:current-page="setCurrentPage"
					@size-change="(val: number) => setPageSize(val as 10 | 20 | 50)"
				/>
			</div>
		</div>
		<SelectedItemsInfo
			:selected-count="selection.selectedCount.value"
			@delete-selected="dataTableOperations.handleDeleteSelected"
			@clear-selection="selection.handleClearSelection"
		/>
	</div>
</template>

<style module lang="scss">
.wrapper {
	// AG Grid style overrides
	--ag-foreground-color: var(--color--text);
	--ag-cell-text-color: var(--color--text--shade-1);
	--ag-accent-color: var(--p--color--secondary-470);
	--ag-row-hover-color: var(--color--background--light-1);
	--ag-background-color: var(--color--background--light-3);
	--ag-border-color: var(--border-color);
	--ag-border-radius: var(--radius);
	--ag-wrapper-border-radius: 0;
	--ag-font-family: var(--font-family);
	--ag-font-size: var(--font-size--xs);
	--ag-font-color: var(--color--text);
	--ag-row-height: calc(var(--ag-grid-size) * 0.8 + 32px);
	--ag-header-background-color: var(--color--background--light-1);
	--ag-header-font-size: var(--font-size--xs);
	--ag-header-font-weight: var(--font-weight--medium);
	--ag-header-foreground-color: var(--color--text--shade-1);
	--ag-cell-horizontal-padding: var(--spacing--2xs);
	--ag-header-height: calc(var(--ag-grid-size) * 0.8 + 32px);
	--ag-header-column-border-height: 100%;
	--ag-range-selection-border-color: var(--p--color--secondary-470);
	--ag-input-padding-start: var(--spacing--2xs);
	--ag-input-background-color: var(--color--text--tint-3);
	--ag-focus-shadow: none;

	:global(.ag-cell) {
		display: flex;
		align-items: center;
	}

	:global(.ag-header-cell-resize) {
		width: var(--spacing--xs);
		// this is needed so that we compensate for the width
		right: -7px;
	}

	:global(.ag-cell[col-id='ag-Grid-SelectionColumn']) {
		border: none;
		padding-left: var(--spacing--lg);
	}

	:global(.ag-header-cell[col-id='ag-Grid-SelectionColumn']) {
		padding-left: var(--spacing--lg);
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
		color: var(--color--text--tint-1);
	}

	:global(.system-column),
	:global(.system-cell) {
		color: var(--color--text--tint-1);
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
			left: calc(var(--spacing--4xs) * -1);
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
			padding-top: var(--spacing--2xs);

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

	:global(.ag-text-field-input-wrapper),
	:global(.ag-number-field-input-wrapper) {
		&:before {
			display: none;
		}

		:global(.ag-input-field-input) {
			padding-left: var(--ag-spacing);
		}
	}

	:global(.ag-picker-field-wrapper) {
		border-radius: var(--radius);
		padding-left: var(--ag-spacing);
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
			border-top: var(--border-width) var(--border-style) var(--ag-border-color);
		}
	}

	:global(.ag-row[row-id='__n8n_add_row__']) {
		border-bottom: none;
	}

	:global(.ag-row-last) {
		border-bottom-color: var(--ag-border-color);
	}

	:global(.ag-filter-body-wrapper) {
		min-width: 200px;
	}

	// we should make this look like the text button as we can't use the component directly
	:global(.ag-filter-apply-panel) {
		padding-top: 0;

		:global(.ag-filter-apply-panel-button) {
			background: transparent;
			border: none;
			padding: 0;

			&:hover {
				color: var(--color--primary);
				background: transparent;
			}
		}
	}
}

.grid-container {
	position: relative;
	display: flex;
	width: 100%;
	min-height: 500px;
	flex-direction: column;
	gap: var(--spacing--md);
	align-items: center;
}

.footer {
	display: flex;
	width: 100%;
	justify-content: flex-end;
	margin-bottom: var(--spacing--lg);
	padding-right: var(--spacing--xl);

	:global(.el-pagination__sizes) {
		height: 100%;
		position: relative;
		top: -1px;

		input {
			height: 100%;
			min-height: 28px;
		}

		:global(.el-input__suffix) {
			width: var(--spacing--md);
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
