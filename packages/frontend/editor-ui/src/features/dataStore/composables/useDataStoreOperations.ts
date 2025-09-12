import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useTelemetry } from '@/composables/useTelemetry';
import type {
	AddColumnResponse,
	DataStoreColumn,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import { ref, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type {
	CellKeyDownEvent,
	CellValueChangedEvent,
	ColDef,
	ColumnMovedEvent,
	GridApi,
} from 'ag-grid-community';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { MODAL_CONFIRM } from '@/constants';
import { isDataStoreValue, isAGGridCellType } from '@/features/dataStore/typeGuards';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';
import { areValuesEqual } from '@/features/dataStore/utils/typeUtils';

export type UseDataStoreOperationsParams = {
	colDefs: Ref<ColDef[]>;
	rowData: Ref<DataStoreRow[]>;
	deleteGridColumn: (columnId: string) => void;
	addGridColumn: (column: DataStoreColumn) => void;
	setGridData: (params: { rowData?: DataStoreRow[]; colDefs?: ColDef[] }) => void;
	insertGridColumnAtIndex: (column: ColDef, index: number) => void;
	moveGridColumn: (oldIndex: number, newIndex: number) => void;
	dataStoreId: string;
	projectId: string;
	gridApi: Ref<GridApi>;
	totalItems: Ref<number>;
	setTotalItems: (count: number) => void;
	ensureItemOnPage: (itemIndex: number) => Promise<void>;
	focusFirstEditableCell: (rowId: number) => void;
	toggleSave: (value: boolean) => void;
	currentPage: Ref<number>;
	pageSize: Ref<number>;
	currentSortBy: Ref<string>;
	currentSortOrder: Ref<string | null>;
	handleClearSelection: () => void;
	selectedRowIds: Ref<Set<number>>;
	handleCopyFocusedCell: (params: CellKeyDownEvent<DataStoreRow>) => Promise<void>;
};

export const useDataStoreOperations = ({
	colDefs,
	rowData,
	deleteGridColumn,
	addGridColumn,
	setGridData,
	insertGridColumnAtIndex,
	moveGridColumn,
	dataStoreId,
	projectId,
	gridApi,
	totalItems,
	setTotalItems,
	ensureItemOnPage,
	focusFirstEditableCell,
	toggleSave,
	currentPage,
	pageSize,
	currentSortBy,
	currentSortOrder,
	handleClearSelection,
	selectedRowIds,
	handleCopyFocusedCell,
}: UseDataStoreOperationsParams) => {
	const i18n = useI18n();
	const toast = useToast();
	const message = useMessage();
	const dataStoreStore = useDataStoreStore();
	const contentLoading = ref(false);
	const telemetry = useTelemetry();
	const dataStoreTypes = useDataStoreTypes();

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
			await dataStoreStore.deleteDataStoreColumn(dataStoreId, projectId, columnId);
			telemetry.track('User deleted data table column', {
				column_id: columnId,
				column_type: columnToDelete.cellDataType,
				data_table_id: dataStoreId,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('dataStore.deleteColumn.error'));
			insertGridColumnAtIndex(columnToDelete, columnToDeleteIndex);
			rowData.value = rowDataOldValue;
			setGridData({ rowData: rowData.value });
		}
	}

	async function onAddColumn(column: DataStoreColumnCreatePayload): Promise<AddColumnResponse> {
		try {
			const newColumn = await dataStoreStore.addDataStoreColumn(dataStoreId, projectId, column);
			addGridColumn(newColumn);
			rowData.value = rowData.value.map((row) => {
				return { ...row, [newColumn.name]: null };
			});
			setGridData({ rowData: rowData.value });
			telemetry.track('User added data table column', {
				column_id: newColumn.id,
				column_type: newColumn.type,
				data_table_id: dataStoreId,
			});
			return { success: true, httpStatus: 200 };
		} catch (error) {
			const addColumnError = dataStoreTypes.getAddColumnError(error);
			return {
				success: false,
				httpStatus: addColumnError.httpStatus,
				errorMessage: addColumnError.message,
			};
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
				dataStoreId,
				projectId,
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
			toggleSave(true);
			const insertedRow = await dataStoreStore.insertEmptyRow(dataStoreId, projectId);
			const newRow: DataStoreRow = insertedRow;
			rowData.value.push(newRow);
			setTotalItems(totalItems.value + 1);
			setGridData({ rowData: rowData.value });
			focusFirstEditableCell(newRow.id as number);
			telemetry.track('User added row to data table', {
				data_table_id: dataStoreId,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('dataStore.addRow.error'));
		} finally {
			toggleSave(false);
			contentLoading.value = false;
		}
	}

	const onCellValueChanged = async (params: CellValueChangedEvent<DataStoreRow>) => {
		const { data, api, oldValue, colDef } = params;
		const value = params.data[colDef.field!];

		const cellType = isAGGridCellType(colDef.cellDataType)
			? dataStoreTypes.mapToDataStoreColumnType(colDef.cellDataType)
			: undefined;

		if (value === undefined || areValuesEqual(oldValue, value, cellType)) {
			return;
		}

		if (typeof data.id !== 'number') {
			throw new Error('Expected row id to be a number');
		}
		const fieldName = String(colDef.field);
		const id = data.id;

		try {
			toggleSave(true);
			await dataStoreStore.updateRow(dataStoreId, projectId, id, {
				[fieldName]: value,
			});
			telemetry.track('User edited data table content', {
				data_table_id: dataStoreId,
				column_id: colDef.colId,
				column_type: colDef.cellDataType,
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
			toggleSave(false);
		}
	};

	async function fetchDataStoreRows() {
		try {
			contentLoading.value = true;

			const fetchedRows = await dataStoreStore.fetchDataStoreContent(
				dataStoreId,
				projectId,
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
			toggleSave(true);
			const idsToDelete = Array.from(selectedRowIds.value);
			await dataStoreStore.deleteRows(dataStoreId, projectId, idsToDelete);
			await fetchDataStoreRows();

			telemetry.track('User deleted rows in data table', {
				data_table_id: dataStoreId,
				deleted_row_count: idsToDelete.length,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('dataStore.deleteRows.error'));
		} finally {
			toggleSave(false);
		}
	};

	const onCellKeyDown = async (params: CellKeyDownEvent<DataStoreRow>) => {
		const event = params.event as KeyboardEvent;
		const target = event.target as HTMLElement;

		const isSelectionColumn = params.column.getColId() === 'ag-Grid-SelectionColumn';
		const isEditing =
			params.api.getEditingCells().length > 0 ||
			(target instanceof HTMLInputElement && !isSelectionColumn);
		if (isEditing) {
			return;
		}

		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
			event.preventDefault();
			await handleCopyFocusedCell(params);
			return;
		}

		if (event.key === 'Escape') {
			handleClearSelection();
			return;
		}

		if ((event.key !== 'Delete' && event.key !== 'Backspace') || selectedRowIds.value.size === 0) {
			return;
		}
		event.preventDefault();
		await handleDeleteSelected();
	};

	return {
		onDeleteColumn,
		onAddColumn,
		onColumnMoved,
		onAddRowClick,
		contentLoading,
		onCellValueChanged,
		fetchDataStoreRows,
		handleDeleteSelected,
		onCellKeyDown,
	};
};
