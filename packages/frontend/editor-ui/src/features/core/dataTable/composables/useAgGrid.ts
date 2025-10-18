import { computed, ref, type Ref } from 'vue';
import type {
	CellClickedEvent,
	CellEditingStartedEvent,
	CellEditingStoppedEvent,
	CellKeyDownEvent,
	GridApi,
	GridReadyEvent,
	SortChangedEvent,
	SortDirection,
	ColDef,
} from 'ag-grid-community';
import { useClipboard } from '@/composables/useClipboard';
import { onClickOutside } from '@vueuse/core';

export type UseAgGridOptions = {
	gridContainerRef: Ref<HTMLElement | null>;
	defaultSortColumn: string;
	pinnedBottomRowId?: string | number;
	defaultColDef?: ColDef;
};

export const useAgGrid = <TRowData extends Record<string, unknown> = Record<string, unknown>>({
	gridContainerRef,
	defaultSortColumn,
	pinnedBottomRowId,
	defaultColDef,
}: UseAgGridOptions) => {
	const gridApi = ref<GridApi | null>(null);
	const isTextEditorOpen = ref(false);
	const currentSortBy = ref<string>(defaultSortColumn);
	const currentSortOrder = ref<SortDirection>('asc');

	const initializedGridApi = computed(() => {
		if (!gridApi.value) {
			throw new Error('Grid API is not initialized');
		}
		return gridApi.value;
	});

	const onClipboardPaste = (data: string) => {
		if (!gridApi.value) return;
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
			if (data.toLowerCase() === 'true') {
				row.setDataValue(focusedCell.column.getColId(), true);
			} else if (data.toLowerCase() === 'false') {
				row.setDataValue(focusedCell.column.getColId(), false);
			}
		}
	};

	const { copy: copyToClipboard } = useClipboard({
		onPaste: onClipboardPaste,
	});

	// Track the last focused cell so we can start editing when users click on it
	// AG Grid doesn't provide cell blur event so we need to reset this manually
	const lastFocusedCell = ref<{ rowIndex: number; colId: string } | null>(null);

	const onGridReady = (params: GridReadyEvent) => {
		gridApi.value = params.api;
		// Ensure popups (e.g., agLargeTextCellEditor) are positioned relative to the grid container
		// to avoid misalignment when the page scrolls.
		if (gridContainerRef.value) {
			params.api.setGridOption('popupParent', gridContainerRef.value);
		}
		if (defaultColDef) {
			params.api.setGridOption('defaultColDef', defaultColDef);
		}
	};

	const setGridData = ({
		colDefs,
		rowData,
	}: {
		colDefs?: ColDef[];
		rowData?: TRowData[];
	}) => {
		if (colDefs) {
			initializedGridApi.value.setGridOption('columnDefs', colDefs);
		}

		if (rowData) {
			initializedGridApi.value.setGridOption('rowData', rowData);
		}

		if (pinnedBottomRowId !== undefined) {
			initializedGridApi.value.setGridOption('pinnedBottomRowData', [{ id: pinnedBottomRowId }]);
		}
	};

	const focusFirstEditableCell = (rowId: number, excludeColumnId?: string) => {
		const rowNode = initializedGridApi.value.getRowNode(String(rowId));
		if (rowNode?.rowIndex === null || rowNode?.rowIndex === undefined) return;
		const rowIndex = rowNode.rowIndex;

		const displayed = initializedGridApi.value.getAllDisplayedColumns();
		const firstEditable = displayed.find((col) => {
			const def = col.getColDef();
			if (!def) return false;
			if (excludeColumnId && def.colId === excludeColumnId) return false;
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

	const onCellEditingStarted = (params: CellEditingStartedEvent<TRowData>) => {
		if (params.column.getColDef().cellDataType === 'text') {
			isTextEditorOpen.value = true;
		} else {
			isTextEditorOpen.value = false;
		}
	};

	const onCellEditingStopped = (params: CellEditingStoppedEvent<TRowData>) => {
		if (params.column.getColDef().cellDataType === 'text') {
			isTextEditorOpen.value = false;
		}
	};

	const handleCopyFocusedCell = async (params: CellKeyDownEvent<TRowData>) => {
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

	const onCellClicked = (params: CellClickedEvent<TRowData>) => {
		const clickedCellColumn = params.column.getColId();
		const clickedCellRow = params.rowIndex;

		if (
			clickedCellRow === null ||
			params.api.isEditing({
				rowIndex: clickedCellRow,
				column: params.column,
				rowPinned: null,
			})
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

	const onSortChanged = (event: SortChangedEvent, colDefs: ColDef[]) => {
		const sortedColumn = event.columns?.filter((col) => col.getSort() !== null).pop() ?? null;

		if (sortedColumn) {
			const colId = sortedColumn.getColId();
			const columnDef = colDefs.find((col) => col.colId === colId);

			currentSortBy.value = columnDef?.field ?? colId;
			currentSortOrder.value = sortedColumn.getSort() ?? 'asc';
		} else {
			currentSortBy.value = defaultSortColumn;
			currentSortOrder.value = 'asc';
		}
	};

	onClickOutside(gridContainerRef, () => {
		resetLastFocusedCell();
		initializedGridApi.value.clearFocusedCell();
	});

	return {
		gridApi: initializedGridApi,
		onGridReady,
		setGridData,
		focusFirstEditableCell,
		onCellEditingStarted,
		onCellEditingStopped,
		handleCopyFocusedCell,
		onCellClicked,
		resetLastFocusedCell,
		currentSortBy,
		currentSortOrder,
		onSortChanged,
		isTextEditorOpen,
	};
};
