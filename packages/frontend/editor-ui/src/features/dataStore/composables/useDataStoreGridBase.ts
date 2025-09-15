import { computed, ref, type Ref } from 'vue';
import type {
	CellClickedEvent,
	CellEditingStartedEvent,
	CellEditingStoppedEvent,
	CellKeyDownEvent,
	ColDef,
	GridApi,
	GridReadyEvent,
	ICellRendererParams,
	SortChangedEvent,
	SortDirection,
} from 'ag-grid-community';
import type {
	AddColumnResponse,
	DataStoreColumn,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import {
	ADD_ROW_ROW_ID,
	DATA_STORE_ID_COLUMN_WIDTH,
	DEFAULT_COLUMN_WIDTH,
	DEFAULT_ID_COLUMN_NAME,
} from '@/features/dataStore/constants';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';
import ColumnHeader from '@/features/dataStore/components/dataGrid/ColumnHeader.vue';
import ElDatePickerCellEditor from '@/features/dataStore/components/dataGrid/ElDatePickerCellEditor.vue';
import orderBy from 'lodash/orderBy';
import AddColumnButton from '@/features/dataStore/components/dataGrid/AddColumnButton.vue';
import AddRowButton from '@/features/dataStore/components/dataGrid/AddRowButton.vue';
import { reorderItem } from '@/features/dataStore/utils';
import { useClipboard } from '@/composables/useClipboard';
import { onClickOutside } from '@vueuse/core';
import {
	getCellClass,
	createValueGetter,
	createCellRendererSelector,
	createStringValueSetter,
	stringCellEditorParams,
	dateValueFormatter,
	numberValueFormatter,
} from '@/features/dataStore/utils/columnUtils';

export const useDataStoreGridBase = ({
	gridContainerRef,
	onDeleteColumn,
	onAddRowClick,
	onAddColumn,
}: {
	gridContainerRef: Ref<HTMLElement | null>;
	onDeleteColumn: (columnId: string) => void;
	onAddRowClick: () => void;
	onAddColumn: (column: DataStoreColumnCreatePayload) => Promise<AddColumnResponse>;
}) => {
	const gridApi = ref<GridApi | null>(null);
	const colDefs = ref<ColDef[]>([]);
	const isTextEditorOpen = ref(false);
	const { mapToAGCellType } = useDataStoreTypes();
	const { copy: copyToClipboard } = useClipboard({ onPaste: onClipboardPaste });
	const currentSortBy = ref<string>(DEFAULT_ID_COLUMN_NAME);
	const currentSortOrder = ref<SortDirection>('asc');

	// Track the last focused cell so we can start editing when users click on it
	// AG Grid doesn't provide cell blur event so we need to reset this manually
	const lastFocusedCell = ref<{ rowIndex: number; colId: string } | null>(null);
	const initializedGridApi = computed(() => {
		if (!gridApi.value) {
			throw new Error('Grid API is not initialized');
		}
		return gridApi.value;
	});

	const onGridReady = (params: GridReadyEvent) => {
		gridApi.value = params.api;
		// Ensure popups (e.g., agLargeTextCellEditor) are positioned relative to the grid container
		// to avoid misalignment when the page scrolls.
		if (gridContainerRef.value) {
			params.api.setGridOption('popupParent', gridContainerRef.value);
		}
	};

	const setGridData = ({
		colDefs,
		rowData,
	}: {
		colDefs?: ColDef[];
		rowData?: DataStoreRow[];
	}) => {
		if (colDefs) {
			initializedGridApi.value.setGridOption('columnDefs', colDefs);
		}

		if (rowData) {
			initializedGridApi.value.setGridOption('rowData', rowData);
		}

		initializedGridApi.value.setGridOption('pinnedBottomRowData', [{ id: ADD_ROW_ROW_ID }]);
	};

	const focusFirstEditableCell = (rowId: number) => {
		const rowNode = initializedGridApi.value.getRowNode(String(rowId));
		if (rowNode?.rowIndex === null) return;
		const rowIndex = rowNode!.rowIndex;

		const displayed = initializedGridApi.value.getAllDisplayedColumns();
		const firstEditable = displayed.find((col) => {
			const def = col.getColDef();
			if (!def) return false;
			if (def.colId === DEFAULT_ID_COLUMN_NAME) return false;
			return !!def.editable;
		});
		if (!firstEditable) return;
		const columnId = firstEditable.getColId();

		requestAnimationFrame(() => {
			initializedGridApi.value.ensureIndexVisible(rowIndex);
			requestAnimationFrame(() => {
				initializedGridApi.value.setFocusedCell(rowIndex, columnId);
				initializedGridApi.value.startEditingCell({
					rowIndex,
					colKey: columnId,
				});
			});
		});
	};

	const createColumnDef = (col: DataStoreColumn, extraProps: Partial<ColDef> = {}) => {
		const columnDef: ColDef = {
			colId: col.id,
			field: col.name,
			headerName: col.name,
			sortable: true,
			editable: (params) => params.data?.id !== ADD_ROW_ROW_ID,
			resizable: true,
			lockPinned: true,
			headerComponent: ColumnHeader,
			headerComponentParams: { onDelete: onDeleteColumn, allowMenuActions: true },
			cellEditorPopup: false,
			cellDataType: mapToAGCellType(col.type),
			cellClass: getCellClass,
			valueGetter: createValueGetter(col),
			cellRendererSelector: createCellRendererSelector(col),
			width: DEFAULT_COLUMN_WIDTH,
		};

		if (col.type === 'string') {
			columnDef.cellEditor = 'agLargeTextCellEditor';
			columnDef.cellEditorPopup = true;
			columnDef.cellEditorPopupPosition = 'over';
			columnDef.cellEditorParams = stringCellEditorParams;
			columnDef.valueSetter = createStringValueSetter(col, isTextEditorOpen);
		} else if (col.type === 'date') {
			columnDef.cellEditorSelector = () => ({
				component: ElDatePickerCellEditor,
			});
			columnDef.valueFormatter = dateValueFormatter;
			columnDef.cellEditorPopup = true;
		} else if (col.type === 'number') {
			columnDef.valueFormatter = numberValueFormatter;
		}

		return {
			...columnDef,
			...extraProps,
		};
	};

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

	const getColumnDefinitions = (dataStoreColumns: DataStoreColumn[]) => {
		const systemDateColumnOptions: Partial<ColDef> = {
			editable: false,
			suppressMovable: true,
			lockPinned: true,
			lockPosition: 'right',
			headerComponentParams: {
				allowMenuActions: false,
			},
			cellClass: (params) => (params.data?.id === ADD_ROW_ROW_ID ? 'add-row-cell' : 'system-cell'),
			headerClass: 'system-column',
			width: DEFAULT_COLUMN_WIDTH,
		};
		return [
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
					sortable: true,
					suppressMovable: true,
					headerComponent: null,
					lockPosition: true,
					minWidth: DATA_STORE_ID_COLUMN_WIDTH,
					maxWidth: DATA_STORE_ID_COLUMN_WIDTH,
					resizable: false,
					headerClass: 'system-column',
					cellClass: (params) =>
						params.data?.id === ADD_ROW_ROW_ID ? 'add-row-cell' : 'id-column',
					cellRendererSelector: (params: ICellRendererParams) => {
						if (params.value === ADD_ROW_ROW_ID) {
							return {
								component: AddRowButton,
								params: { onClick: onAddRowClick },
							};
						}
						return undefined;
					},
				},
			),
			// Append other columns
			...orderBy(dataStoreColumns, 'index').map((col) => createColumnDef(col)),
			createColumnDef(
				{
					index: dataStoreColumns.length + 1,
					id: 'createdAt',
					name: 'createdAt',
					type: 'date',
				},
				systemDateColumnOptions,
			),
			createColumnDef(
				{
					index: dataStoreColumns.length + 2,
					id: 'updatedAt',
					name: 'updatedAt',
					type: 'date',
				},
				systemDateColumnOptions,
			),
			createColumnDef(
				{
					index: dataStoreColumns.length + 3,
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
					flex: 1,
					headerComponent: AddColumnButton,
					headerComponentParams: { onAddColumn },
				},
			),
		];
	};

	const loadColumns = (dataStoreColumns: DataStoreColumn[]) => {
		colDefs.value = getColumnDefinitions(dataStoreColumns);
		setGridData({ colDefs: colDefs.value });
	};

	const deleteColumn = (columnId: string) => {
		colDefs.value = colDefs.value.filter((col) => col.colId !== columnId);
		setGridData({ colDefs: colDefs.value });
	};

	const insertColumnAtIndex = (column: ColDef, index: number) => {
		colDefs.value.splice(index, 0, column);
		setGridData({ colDefs: colDefs.value });
	};

	const addColumn = (column: DataStoreColumn) => {
		colDefs.value = [
			...colDefs.value.slice(0, -1),
			createColumnDef(column),
			...colDefs.value.slice(-1),
		];
		setGridData({ colDefs: colDefs.value });
	};

	const moveColumn = (oldIndex: number, newIndex: number) => {
		const fromIndex = oldIndex - 1; // exclude ID column
		const columnToBeMoved = colDefs.value[fromIndex];
		if (!columnToBeMoved) {
			return;
		}
		const middleWithIndex = colDefs.value.slice(1, -1).map((col, index) => ({ ...col, index }));
		const reorderedMiddle = reorderItem(middleWithIndex, fromIndex, newIndex)
			.sort((a, b) => a.index - b.index)
			.map(({ index, ...col }) => col);
		colDefs.value = [colDefs.value[0], ...reorderedMiddle, colDefs.value[colDefs.value.length - 1]];
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

	function onClipboardPaste(data: string) {
		const focusedCell = initializedGridApi.value.getFocusedCell();
		const isEditing = initializedGridApi.value.getEditingCells().length > 0;
		if (!focusedCell || isEditing) return;
		const row = initializedGridApi.value.getDisplayedRowAtIndex(focusedCell.rowIndex);
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

	const resetLastFocusedCell = () => {
		lastFocusedCell.value = null;
	};

	const onSortChanged = async (event: SortChangedEvent) => {
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
	};

	onClickOutside(gridContainerRef, () => {
		resetLastFocusedCell();
		initializedGridApi.value.clearFocusedCell();
	});

	return {
		onGridReady,
		setGridData,
		focusFirstEditableCell,
		onCellEditingStarted,
		onCellEditingStopped,
		createColumnDef,
		loadColumns,
		colDefs,
		deleteColumn,
		insertColumnAtIndex,
		addColumn,
		moveColumn,
		gridApi: initializedGridApi,
		handleCopyFocusedCell,
		onCellClicked,
		resetLastFocusedCell,
		currentSortBy,
		currentSortOrder,
		onSortChanged,
	};
};
