<script setup lang="ts" generic="TRow extends DataGridRow">
import { useClipboard } from '@n8n/composables/useClipboard';
import { onClickOutside } from '@vueuse/core';
import type {
	CellClickedEvent,
	CellEditRequestEvent,
	CellKeyDownEvent,
	ColDef,
	ColumnMovedEvent,
	FilterChangedEvent,
	CellMouseOutEvent,
	CellMouseOverEvent,
	GetRowIdParams,
	RowClassParams,
	GridApi,
	GridReadyEvent,
	ICellRendererParams,
	RowSelectionOptions,
	SelectionChangedEvent,
	SortChangedEvent,
	SortDirection,
} from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import { computed, h, nextTick, ref, shallowRef, useTemplateRef, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nPagination from '../N8nPagination';
import {
	DATA_GRID_APPEND_COLUMN_ID,
	DATA_GRID_APPEND_COLUMN_MIN_WIDTH,
	DATA_GRID_DEFAULT_COLUMN_WIDTH,
	DATA_GRID_HEADER_HEIGHT,
	DATA_GRID_ROW_HEIGHT,
	DATA_GRID_SELECTION_COLUMN_ID,
	dataGridTheme,
	registerAgGridModules,
} from './agGrid';
import {
	areCellValuesEqual,
	formatCellValue,
	parsePastedValue,
	toDate,
	toText,
} from './cellValues';
import type {
	DataGridCellEdit,
	DataGridColumn,
	DataGridColumnHeaderOptions,
	DataGridColumnType,
	DataGridEmits,
	DataGridFilter,
	DataGridProps,
	DataGridRow,
	DataGridSlots,
	DataGridSort,
} from './DataGrid.types';
import DataGridColumnHeader from './DataGridColumnHeader.vue';
import DataGridDateEditor from './DataGridDateEditor.vue';
import DataGridDateFilter from './DataGridDateFilter.vue';
import { createDataGridHistory } from './dataGridHistory';
import DataGridLoadingIndicator from './DataGridLoadingIndicator.vue';
import DataGridSlotRenderer from './DataGridSlotRenderer.vue';
import DataGridSpecialValue from './DataGridSpecialValue.vue';
import { getAgFilter, getAgFilterOptions, toAgFilterModel, toDataGridFilters } from './filters';

const props = withDefaults(defineProps<DataGridProps<TRow>>(), {
	loading: false,
	editable: false,
	columnsEditable: false,
	selectable: false,
	selectionDisabled: false,
	stickyHeader: false,
	sortMode: 'client',
	filterMode: 'client',
	paginationMode: 'client',
	pageSizes: () => [10, 20, 50],
});

const emit = defineEmits<DataGridEmits>();
const slots = defineSlots<DataGridSlots<TRow>>();

registerAgGridModules();

const AG_CELL_TYPE: Record<DataGridColumnType, string> = {
	['string']: 'text',
	['number']: 'number',
	['boolean']: 'boolean',
	date: 'date',
	json: 'object',
};
const TEXT_EDITOR_MAX_LENGTH = 999999999;
const DEFAULT_ITEMS_PER_PAGE = 10;
const BOOLEAN_CELL_CLASS = 'n8n-data-grid-boolean-cell';
const APPEND_HEADER_CLASS = 'n8n-data-grid-append-header';
const APPEND_CELL_CLASS = 'n8n-data-grid-append-cell';
const LOADING_OVERLAY = '<span aria-hidden="true"></span>';
const FOOTER_ROW_ID = '__n8n_data_grid_footer__';
const FOOTER_CELL_CLASS = 'n8n-data-grid-footer-cell';

const { t } = useI18n();
const containerRef = useTemplateRef<HTMLElement>('container');
const gridApi = shallowRef<GridApi<TRow> | null>(null);

const getRowKey = (row: TRow) =>
	typeof props.rowKey === 'function' ? props.rowKey(row) : String(row[props.rowKey]);

const agRowClassRules = computed(() => {
	const rules = props.rowClassRules;
	if (!rules) return undefined;
	const classesByKey = new Map(
		props.rows.map((row) => [
			getRowKey(row),
			new Set(Object.keys(rules).filter((className) => rules[className](row))),
		]),
	);
	return Object.fromEntries(
		Object.keys(rules).map((className) => [
			className,
			(params: RowClassParams<TRow>) =>
				!!params.data &&
				!params.node.rowPinned &&
				!!classesByKey.get(getRowKey(params.data))?.has(className),
		]),
	);
});

const getRowId = (params: GetRowIdParams<TRow>) =>
	params.rowPinned === 'bottom' ? FOOTER_ROW_ID : getRowKey(params.data);

const hasFooterRow = !!slots['footer-row'];
const pinnedBottomRows = hasFooterRow ? [{}] : [];
const viewportMinHeight = hasFooterRow ? 'auto' : `${DATA_GRID_ROW_HEIGHT}px`;

const noRowsOverlayParams = {
	render: () =>
		slots.empty?.() ?? [h('span', { 'data-test-id': 'data-grid-no-rows' }, t('dataGrid.noRows'))],
};

const rowsByKey = computed(() => new Map(props.rows.map((row) => [getRowKey(row), row])));
const columnsById = computed(() => new Map(props.columns.map((column) => [column.id, column])));
const columnsByField = computed(
	() => new Map(props.columns.map((column) => [column.field, column])),
);

const readCellValue = (column: DataGridColumn<TRow>, row: TRow) => {
	const value = row[column.field] ?? null;
	return column.type === 'date' && value !== null ? (toDate(value) ?? value) : value;
};

const isColumnEditable = (column: DataGridColumn<TRow>, row: TRow) => {
	if (!props.editable || column.type === 'json') return false;
	return typeof column.editable === 'function' ? column.editable(row) : column.editable !== false;
};

const isSlotCell = (column: DataGridColumn<TRow>, row: TRow) =>
	typeof column.cellSlot === 'function' ? column.cellSlot(row) : column.cellSlot === true;

const isChange = (edit: DataGridCellEdit) => {
	const row = rowsByKey.value.get(edit.rowKey);
	const column = columnsByField.value.get(edit.field);
	return !!row && !!column && !areCellValuesEqual(row[column.field], edit.newValue, column.type);
};

const history = createDataGridHistory({ isChange });

const applyUserEdit = (edit: DataGridCellEdit) => {
	if (!isChange(edit)) return;
	history.record(edit);
	emit('cellEdit', edit);
};

const emitHistoryEdit = (edit: DataGridCellEdit | undefined) => {
	if (edit) emit('cellEdit', edit);
};

const createEdit = (
	column: DataGridColumn<TRow>,
	row: TRow,
	newValue: unknown,
): DataGridCellEdit => ({
	rowKey: getRowKey(row),
	field: column.field,
	oldValue: row[column.field] ?? null,
	newValue,
});

const renderSpecialValue = (label: string) => ({
	component: DataGridSpecialValue,
	params: { label },
});

const renderFooterCell = (column: DataGridColumn<TRow>) => ({
	component: DataGridSlotRenderer,
	params:
		props.columns[0]?.id === column.id
			? { render: () => slots['footer-row']?.(), testId: 'data-grid-footer-row' }
			: { render: () => [] },
});

const createCellRendererSelector =
	(column: DataGridColumn<TRow>) => (params: ICellRendererParams<TRow>) => {
		if (params.node.rowPinned) return renderFooterCell(column);
		const row = params.data;
		if (!row) return undefined;
		if (slots.cell && isSlotCell(column, row)) {
			return {
				component: DataGridSlotRenderer,
				params: {
					render: () =>
						slots.cell?.({
							row,
							column,
							value: params.value,
							formattedValue: params.valueFormatted ?? '',
						}),
				},
			};
		}
		if (params.value === null || params.value === undefined) {
			return renderSpecialValue(t('dataGrid.null'));
		}
		if (params.value === '') {
			return renderSpecialValue(t('dataGrid.empty'));
		}
		return undefined;
	};

const getEditorProps = (type: DataGridColumnType): Partial<ColDef<TRow>> => {
	if (type === 'string') {
		return {
			cellEditor: 'agLargeTextCellEditor',
			cellEditorPopup: true,
			cellEditorPopupPosition: 'over',
			cellEditorParams: (params: { value: unknown }) => ({
				value: params.value ?? '',
				maxLength: TEXT_EDITOR_MAX_LENGTH,
			}),
		};
	}
	if (type === 'date') {
		return {
			cellEditor: DataGridDateEditor,
			cellEditorPopup: true,
		};
	}
	return {};
};

const toColDef = (column: DataGridColumn<TRow>): ColDef<TRow> => {
	const isFilterable = column.filterable ?? column.type !== 'json';
	const headerParams: DataGridColumnHeaderOptions = {
		dataGridColumn: { icon: column.icon, renameable: column.renameable, actions: column.actions },
		isColumnsEditable: () => props.columnsEditable,
		onRename: (columnId, label) => emit('columnRename', { columnId, label }),
		onAction: (columnId, actionId) => emit('columnAction', { columnId, actionId }),
		onSort: requestSort,
		renderLabel: column.headerSlot && slots.header ? () => slots.header?.({ column }) : undefined,
	};

	return {
		colId: column.id,
		headerName: column.label,
		cellDataType: AG_CELL_TYPE[column.type],
		valueGetter: (params) => (params.data ? readCellValue(column, params.data) : null),
		valueFormatter: (params) =>
			column.format ? column.format(params.value) : formatCellValue(params.value, column.type),
		initialWidth: column.width ?? (column.flex ? undefined : DATA_GRID_DEFAULT_COLUMN_WIDTH),
		minWidth: column.minWidth,
		maxWidth: column.maxWidth,
		flex: column.flex,
		resizable: column.resizable ?? true,
		lockPinned: true,
		lockPosition: column.lock,
		autoHeight: column.autoHeight,
		wrapText: column.autoHeight,
		suppressMovable: column.lock !== undefined,
		sortable: column.sortable ?? column.type !== 'json',
		comparator: props.sortMode === 'server' ? () => 0 : undefined,
		filter: isFilterable ? getAgFilter(column.type) : false,
		filterParams: {
			filterOptions: getAgFilterOptions(column.type, props.filterMode, t),
			maxNumConditions: 1,
			buttons: ['reset'],
		},
		dateComponent: column.type === 'date' ? DataGridDateFilter : undefined,
		editable: (params) =>
			!params.node.rowPinned && !!params.data && isColumnEditable(column, params.data),
		headerComponent: DataGridColumnHeader,
		headerComponentParams: headerParams,
		headerClass: column.headerClass,
		cellClass: (params) => {
			if (params.node.rowPinned) return FOOTER_CELL_CLASS;
			if (!params.data) return undefined;
			const custom =
				typeof column.cellClass === 'function' ? column.cellClass(params.data) : column.cellClass;
			return [column.type === 'boolean' ? BOOLEAN_CELL_CLASS : undefined, custom].filter(
				(name): name is string => !!name,
			);
		},
		cellRendererSelector: createCellRendererSelector(column),
		...getEditorProps(column.type),
	};
};

const appendColumnDef = (): ColDef<TRow> => ({
	colId: DATA_GRID_APPEND_COLUMN_ID,
	headerName: '',
	minWidth: DATA_GRID_APPEND_COLUMN_MIN_WIDTH,
	flex: 1,
	sortable: false,
	filter: false,
	editable: false,
	resizable: false,
	suppressMovable: true,
	lockPinned: true,
	lockPosition: 'right',
	headerClass: APPEND_HEADER_CLASS,
	cellClass: APPEND_CELL_CLASS,
	headerComponent: DataGridSlotRenderer,
	headerComponentParams: { render: () => slots['header-append']?.() },
	valueGetter: () => null,
	cellRenderer: () => '',
});

const hasAutoHeightColumns = computed(() => props.columns.some((column) => column.autoHeight));

const columnDefs = computed(() => [
	...props.columns.map(toColDef),
	...(slots['header-append'] ? [appendColumnDef()] : []),
]);

const rowSelection = computed<RowSelectionOptions<TRow> | undefined>(() => {
	if (!props.selectable) return undefined;
	const isDisabled = props.selectionDisabled;
	return {
		mode: 'multiRow',
		enableClickSelection: false,
		hideDisabledCheckboxes: false,
		checkboxes: (params) => !params.node.rowPinned,
		isRowSelectable: (node) => !isDisabled && !node.rowPinned,
	};
});

const sortState = ref<DataGridSort>(props.sort ?? null);
const filterState = ref<DataGridFilter[]>(props.filters ?? []);
const selectionState = ref<string[]>(props.selectedKeys ?? []);
const pageState = ref(props.page ?? 1);
const itemsPerPageState = ref(props.itemsPerPage ?? props.pageSizes[0] ?? DEFAULT_ITEMS_PER_PAGE);
const clientTotal = ref(0);

const isClientPagination = computed(() => props.paginationMode === 'client');
const displayedPage = computed(() =>
	props.paginationMode === 'server' ? props.page : pageState.value,
);
const displayedItemsPerPage = computed(() =>
	props.paginationMode === 'server' ? props.itemsPerPage : itemsPerPageState.value,
);
const displayedTotal = computed(() =>
	props.paginationMode === 'server' ? props.total : clientTotal.value,
);

const withApi = (fn: (api: GridApi<TRow>) => void) => {
	if (gridApi.value) fn(gridApi.value);
};

const applySort = () =>
	withApi((api) => {
		const sort = sortState.value;
		api.applyColumnState({
			state: props.columns.map((column) => ({
				colId: column.id,
				sort: sort?.field === column.field ? sort.direction : null,
			})),
		});
	});

const applyFilters = () =>
	withApi((api) => {
		const current = toDataGridFilters(api.getFilterModel(), props.columns);
		if (JSON.stringify(current) !== JSON.stringify(filterState.value)) {
			api.setFilterModel(toAgFilterModel(filterState.value, props.columns));
		}
	});

const applySelection = () =>
	withApi((api) => {
		const selected = new Set(selectionState.value);
		api.forEachNode((node) => {
			const isSelected = !!node.data && selected.has(getRowKey(node.data));
			if (node.isSelected() !== isSelected) node.setSelected(isSelected, false, 'api');
		});
	});

const applyColumnOrder = () =>
	withApi((api) => {
		api.applyColumnState({
			state: props.columns.map((column) => ({ colId: column.id })),
			applyOrder: true,
		});
	});

const goToFirstClientPage = () => {
	if (!isClientPagination.value) return;
	pageState.value = 1;
	withApi((api) => api.paginationGoToFirstPage());
};

const onGridReady = (event: GridReadyEvent<TRow>) => {
	gridApi.value = event.api;
	if (containerRef.value) {
		event.api.setGridOption('popupParent', containerRef.value);
	}
	event.api.setGridOption('columnDefs', columnDefs.value);
	event.api.setGridOption('rowData', props.rows);
	applySort();
	applyFilters();
	applySelection();
	if (isClientPagination.value && pageState.value > 1) {
		event.api.paginationGoToPage(pageState.value - 1);
	}
	emit('gridReady');
};

const requestSort = (columnId: string | undefined, direction: SortDirection) => {
	const column = columnId ? columnsById.value.get(columnId) : undefined;
	const requested: DataGridSort = column && direction ? { field: column.field, direction } : null;

	if (props.sortMode === 'client') {
		sortState.value = requested;
		goToFirstClientPage();
	}
	applySort();
	props['onUpdate:sort']?.(requested);
};

const onSortChanged = (event: SortChangedEvent<TRow>) => {
	if (event.source !== 'uiColumnSorted') return;
	const sorted = event.api.getColumnState().find((state) => state.sort);
	requestSort(sorted?.colId, sorted?.sort ?? null);
};

const onFilterChanged = (event: FilterChangedEvent<TRow>) => {
	if (event.source === 'api') return;
	const requested = toDataGridFilters(event.api.getFilterModel(), props.columns);
	if (props.filterMode === 'client') {
		filterState.value = requested;
		goToFirstClientPage();
	}
	props['onUpdate:filters']?.(requested);
	void nextTick(applyFilters);
};

const requestSelection = (keys: string[]) => {
	if (props.selectedKeys === undefined) {
		selectionState.value = keys;
	}
	props['onUpdate:selectedKeys']?.(keys);
	void nextTick(applySelection);
};

const onSelectionChanged = (event: SelectionChangedEvent<TRow>) => {
	if (event.source === 'api') return;
	requestSelection(
		event.api.getSelectedNodes().flatMap((node) => (node.data ? [getRowKey(node.data)] : [])),
	);
};

const onColumnMoved = (event: ColumnMovedEvent<TRow>) => {
	if (!event.finished || event.source !== 'uiColumnMoved' || !event.column) return;
	const columnId = event.column.getColId();
	const order = event.api
		.getColumnState()
		.map((state) => state.colId)
		.filter((id) => columnsById.value.has(id));
	emit('columnMove', { columnId, toIndex: order.indexOf(columnId) });
	void nextTick(applyColumnOrder);
};

const onPaginationChanged = () =>
	withApi((api) => {
		if (!isClientPagination.value) return;
		clientTotal.value = api.paginationGetRowCount();
		pageState.value = api.paginationGetCurrentPage() + 1;
	});

const onPageChange = (page: number) => {
	if (isClientPagination.value) {
		pageState.value = page;
		withApi((api) => api.paginationGoToPage(page - 1));
	}
	props['onUpdate:page']?.(page);
};

const onItemsPerPageChange = (itemsPerPage: number) => {
	if (isClientPagination.value) {
		itemsPerPageState.value = itemsPerPage;
		pageState.value = 1;
	}
	props['onUpdate:itemsPerPage']?.(itemsPerPage);
};

const onCellEditRequest = (event: CellEditRequestEvent<TRow>) => {
	const column = columnsById.value.get(event.column.getColId());
	if (!column) return;
	const edit = createEdit(column, event.data, event.newValue);
	if (column.type === 'string') {
		edit.newValue = edit.newValue ?? '';
		if (edit.oldValue === null && edit.newValue === '') return;
	}
	applyUserEdit(edit);
};

const lastFocusedCell = ref<{ rowIndex: number; colId: string } | null>(null);

const onCellMouseOver = (event: CellMouseOverEvent<TRow>) => {
	if (event.node.rowPinned || !event.data) return;
	const columnId = event.column.getColId();
	emit('cellHover', {
		rowKey: getRowKey(event.data),
		columnId: columnsById.value.has(columnId) ? columnId : null,
	});
};

const onCellMouseOut = (_event: CellMouseOutEvent<TRow>) => emit('cellHover', null);

const onCellClicked = (event: CellClickedEvent<TRow>) => {
	const rowIndex = event.rowIndex;
	if (event.node.rowPinned || rowIndex === null) return;
	const colId = event.column.getColId();
	const isEditing = event.api.isEditing({ rowIndex, column: event.column, rowPinned: null });
	if (isEditing) return;

	const wasFocused =
		lastFocusedCell.value?.rowIndex === rowIndex && lastFocusedCell.value.colId === colId;
	if (wasFocused && event.column.isCellEditable(event.node)) {
		event.api.startEditingCell({ rowIndex, colKey: colId });
	}
	lastFocusedCell.value = { rowIndex, colId };
};

const getFocusedCell = (api: GridApi<TRow>) => {
	const focused = api.getFocusedCell();
	if (!focused || focused.rowPinned || api.getEditingCells().length > 0) return undefined;
	const node = api.getDisplayedRowAtIndex(focused.rowIndex);
	const column = columnsById.value.get(focused.column.getColId());
	return node?.data && column
		? { node, row: node.data, column, agColumn: focused.column }
		: undefined;
};

const { copy } = useClipboard({
	onPaste: (text) =>
		withApi((api) => {
			const cell = getFocusedCell(api);
			if (!cell || !cell.agColumn.isCellEditable(cell.node)) return;
			const value = parsePastedValue(text, cell.column.type);
			if (value !== undefined) applyUserEdit(createEdit(cell.column, cell.row, value));
		}),
});

const isModifierKey = (event: KeyboardEvent) => event.metaKey || event.ctrlKey;

const onCellKeyDown = async (event: CellKeyDownEvent<TRow>) => {
	if (!(event.event instanceof KeyboardEvent)) return;
	const keyboardEvent = event.event;
	const isSelectionColumn = event.column.getColId() === DATA_GRID_SELECTION_COLUMN_ID;
	const isInInput = keyboardEvent.target instanceof HTMLInputElement && !isSelectionColumn;
	if (event.api.getEditingCells().length > 0 || isInInput) return;

	const key = keyboardEvent.key.toLowerCase();
	if (isModifierKey(keyboardEvent) && key === 'c') {
		keyboardEvent.preventDefault();
		const cell = getFocusedCell(event.api);
		if (cell) await copy(toText(cell.row[cell.column.field]));
		return;
	}
	if (props.editable && isModifierKey(keyboardEvent) && (key === 'z' || key === 'y')) {
		keyboardEvent.preventDefault();
		const isRedo = key === 'y' || keyboardEvent.shiftKey;
		emitHistoryEdit(isRedo ? history.redo() : history.undo());
		return;
	}
	if (keyboardEvent.key === 'Escape') {
		requestSelection([]);
		return;
	}
	const isDeleteKey = keyboardEvent.key === 'Delete' || keyboardEvent.key === 'Backspace';
	if (isDeleteKey && props.editable && selectionState.value.length > 0) {
		keyboardEvent.preventDefault();
		emit('deleteSelected', [...selectionState.value]);
	}
};

const focusCell = (rowKey: string, field?: string, options: { edit?: boolean } = {}) =>
	withApi((api) => {
		const node = api.getRowNode(rowKey);
		if (!node || node.rowIndex === null || !node.data) return;
		const rowIndex = node.rowIndex;
		const column = api
			.getAllDisplayedColumns()
			.find((col) =>
				field ? columnsById.value.get(col.getColId())?.field === field : col.isCellEditable(node),
			);
		if (!column) return;

		if (isClientPagination.value) {
			api.paginationGoToPage(Math.floor(rowIndex / itemsPerPageState.value));
		}
		requestAnimationFrame(() => {
			api.ensureIndexVisible(rowIndex);
			requestAnimationFrame(() => {
				api.setFocusedCell(rowIndex, column);
				if (options.edit) api.startEditingCell({ rowIndex, colKey: column });
			});
		});
	});

onClickOutside(containerRef, () => {
	lastFocusedCell.value = null;
	withApi((api) => api.clearFocusedCell());
});

watch(
	() => props.rows,
	(rows) =>
		withApi((api) => {
			api.setGridOption('rowData', rows);
			applySelection();
		}),
);
watch(columnDefs, (defs) =>
	withApi((api) => {
		api.setGridOption('columnDefs', defs);
		applySort();
	}),
);
watch(
	() => props.sort,
	(sort) => {
		if (sort === undefined) return;
		sortState.value = sort;
		applySort();
	},
);
watch(
	() => props.filters,
	(filters) => {
		if (filters === undefined) return;
		filterState.value = filters;
		applyFilters();
	},
);
watch(
	() => props.selectedKeys,
	(keys) => {
		if (keys === undefined) return;
		selectionState.value = keys;
		applySelection();
	},
);
watch(
	() => props.page,
	(page) => {
		if (page === undefined || !isClientPagination.value) return;
		pageState.value = page;
		withApi((api) => api.paginationGoToPage(page - 1));
	},
);
watch(
	() => props.itemsPerPage,
	(itemsPerPage) => {
		if (itemsPerPage !== undefined) itemsPerPageState.value = itemsPerPage;
	},
);
watch(
	() => props.editable,
	(editable) =>
		withApi((api) => {
			if (!editable) api.stopEditing(true);
			api.refreshCells({ force: true });
		}),
);

defineExpose({ focusCell });
</script>

<template>
	<div :class="['data-grid', { 'data-grid--sticky-header': stickyHeader }]">
		<div
			ref="container"
			:class="['data-grid-container', { 'data-grid-container--has-rows': rows.length > 0 }]"
			:aria-busy="loading"
			data-test-id="data-grid"
		>
			<AgGridVue
				class="data-grid-ag"
				dom-layout="autoHeight"
				:theme="dataGridTheme"
				:row-height="DATA_GRID_ROW_HEIGHT"
				:header-height="DATA_GRID_HEADER_HEIGHT"
				:animate-rows="false"
				:ensure-dom-order="true"
				:suppress-column-virtualisation="hasAutoHeightColumns"
				:read-only-edit="true"
				:get-row-id="getRowId"
				:row-class-rules="agRowClassRules"
				:pinned-bottom-row-data="pinnedBottomRows"
				:row-selection="rowSelection"
				:loading="loading"
				:overlay-loading-template="LOADING_OVERLAY"
				:no-rows-overlay-component="DataGridSlotRenderer"
				:no-rows-overlay-component-params="noRowsOverlayParams"
				:suppress-movable-columns="!columnsEditable"
				:suppress-drag-leave-hides-columns="true"
				:suppress-multi-sort="true"
				:stop-editing-when-cells-lose-focus="true"
				:pagination="isClientPagination"
				:pagination-page-size="itemsPerPageState"
				:suppress-pagination-panel="true"
				@grid-ready="onGridReady"
				@first-data-rendered="emit('firstDataRendered')"
				@cell-edit-request="onCellEditRequest"
				@cell-clicked="onCellClicked"
				@cell-key-down="onCellKeyDown"
				@cell-mouse-over="onCellMouseOver"
				@cell-mouse-out="onCellMouseOut"
				@column-header-clicked="lastFocusedCell = null"
				@column-moved="onColumnMoved"
				@sort-changed="onSortChanged"
				@filter-changed="onFilterChanged"
				@selection-changed="onSelectionChanged"
				@pagination-changed="onPaginationChanged"
			/>
			<DataGridLoadingIndicator v-if="loading" />
		</div>
		<div v-if="paginationMode !== 'none'" class="data-grid-footer">
			<N8nPagination
				:page="displayedPage"
				:items-per-page="displayedItemsPerPage"
				:total="displayedTotal"
				:page-sizes="pageSizes"
				data-test-id="data-grid-pagination"
				@update:page="onPageChange"
				@update:items-per-page="onItemsPerPageChange"
			/>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use '../../css/mixins/utils';

.data-grid {
	--ag-foreground-color: var(--color--text);
	--ag-cell-text-color: var(--color--text--shade-1);
	--ag-accent-color: var(--color--purple-600);
	--ag-row-hover-color: var(--color--background--light-1);
	--ag-background-color: var(--color--background--light-2);
	--ag-border-color: var(--border-color);
	--ag-border-radius: var(--radius);
	--ag-wrapper-border-radius: 0;
	--ag-font-family: var(--font-family);
	--ag-font-size: var(--font-size--xs);
	--ag-font-color: var(--color--text);
	--ag-header-background-color: var(--color--foreground--tint-1);
	--ag-header-font-size: var(--font-size--xs);
	--ag-header-font-weight: var(--font-weight--medium);
	--ag-header-foreground-color: var(--color--text--shade-1);
	--ag-cell-horizontal-padding: var(--spacing--2xs);
	--ag-header-column-border-height: 100%;
	--ag-range-selection-border-color: var(--color--purple-600);
	--ag-input-padding-start: var(--spacing--2xs);
	--ag-input-background-color: var(--color--background--light-2);
	--ag-focus-shadow: none;

	display: flex;
	flex-direction: column;
	width: 100%;
	gap: var(--spacing--md);

	:deep(.ag-body-horizontal-scroll-viewport),
	:deep(.ag-body-vertical-scroll-viewport) {
		scrollbar-color: var(--color--foreground--shade-1) transparent;

		@supports selector(::-webkit-scrollbar) {
			&::-webkit-scrollbar {
				height: var(--spacing--2xs);
				width: var(--spacing--2xs);
			}

			&::-webkit-scrollbar-track {
				background: transparent;
			}

			&::-webkit-scrollbar-thumb {
				border-radius: var(--radius);
				background: var(--color--foreground--shade-1);
			}
		}
	}

	:deep(.ag-root-wrapper) {
		border-left: none;
	}

	:deep(.ag-cell) {
		display: flex;
		align-items: center;
	}

	:deep(.ag-header-cell-resize) {
		width: var(--spacing--xs);
		right: calc(var(--spacing--xs) / -2);
	}

	:deep(.ag-cell[col-id='ag-Grid-SelectionColumn']) {
		border: none;
		padding-left: var(--spacing--lg);
		background-color: transparent;
	}

	:deep(.ag-header-cell[col-id='ag-Grid-SelectionColumn']) {
		padding-left: var(--spacing--lg);

		&::after {
			display: none;
		}
	}

	:deep(.ag-cell[col-id='ag-Grid-SelectionColumn'].ag-cell-focus) {
		outline: none;
	}

	:deep(.ag-large-text-input) {
		position: absolute;
		min-width: 420px;
		padding: 0;

		textarea {
			padding-top: var(--spacing--3xs);

			&:where(:focus-within, :active) {
				border: var(--grid--cell--border-color--editing);
			}
		}
	}

	:deep(.ag-center-cols-viewport) {
		min-height: v-bind(viewportMinHeight);
	}

	:deep(.ag-checkbox-input-wrapper) {
		&:where(:focus-within, :active) {
			box-shadow: none;
		}
	}

	:deep(.ag-text-field-input-wrapper),
	:deep(.ag-number-field-input-wrapper) {
		&::before {
			display: none;
		}

		:deep(.ag-input-field-input) {
			padding-left: var(--ag-spacing);
		}
	}

	:deep(.ag-picker-field-wrapper) {
		border-radius: var(--radius);
		padding-left: var(--ag-spacing);
	}

	:deep(.ag-cell-inline-editing) {
		box-shadow: none;
	}

	:deep(.n8n-data-grid-boolean-cell.ag-cell-inline-editing) {
		border: var(--grid--cell--border-color--editing) !important;
	}

	:deep(.n8n-data-grid-append-header)::after {
		display: none;
	}

	:deep(.n8n-data-grid-footer-cell) {
		border: none !important;
		background-color: transparent !important;
		padding: 0;
	}

	:deep(.ag-floating-bottom .ag-row) {
		border-bottom: none;
	}

	:deep(.n8n-data-grid-append-cell) {
		border: none;
		background-color: transparent;
	}

	:deep(.ag-cell-focus) {
		background-color: var(--grid--row--color--background--selected);
	}

	:deep(.ag-row-last) {
		border-bottom-color: var(--ag-border-color);
	}

	:deep(.ag-filter-body-wrapper) {
		min-width: 200px;
	}

	:deep(.ag-filter-apply-panel) {
		padding-top: 0;

		:deep(.ag-filter-apply-panel-button) {
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

.data-grid :deep(.n8n-data-grid-header) {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	cursor: default;
}

.data-grid :deep(.n8n-data-grid-header--sortable) {
	cursor: pointer;
}

.data-grid :deep(.n8n-data-grid-header-label) {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.data-grid :deep(.n8n-data-grid-header-custom) {
	display: flex;
	flex: 1;
	min-width: 0;

	> * {
		flex: 1;
		min-width: 0;
	}
}

.data-grid :deep(.n8n-data-grid-header-icon),
.data-grid :deep(.n8n-data-grid-header-sort) {
	flex-shrink: 0;
}

.data-grid :deep(.n8n-data-grid-header-sort) {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.data-grid :deep(.n8n-data-grid-header-text) {
	@include utils.utils-ellipsis;
	display: inline-flex;
	align-items: center;
	min-width: 0;
	line-height: 1;

	&:focus-within {
		overflow: visible;
	}
}

.data-grid :deep(.n8n-data-grid-header-filter--active),
.data-grid :deep(.n8n-data-grid-header-filter--active:hover) {
	color: var(--color--primary);
}

.data-grid :deep(.n8n-data-grid-special-value) {
	font-style: italic;
	color: var(--color--text);
}

.data-grid--sticky-header {
	:deep(.ag-root-wrapper),
	:deep(.ag-root-wrapper-body),
	:deep(.ag-root) {
		overflow: clip;
	}

	:deep(.ag-header) {
		position: sticky;
		top: 0;
		z-index: 2;
	}
}

.data-grid-container {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
}

.data-grid-ag {
	width: 100%;
}

.data-grid-container--has-rows :deep(.ag-floating-bottom) {
	border-top: var(--border-width) var(--border-style) var(--ag-border-color);
}

.data-grid-footer {
	display: flex;
	width: 100%;
	justify-content: flex-end;
	padding-right: var(--spacing--xl);
	margin-bottom: var(--spacing--lg);
}
</style>
