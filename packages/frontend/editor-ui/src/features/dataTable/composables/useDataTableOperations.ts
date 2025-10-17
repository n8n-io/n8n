import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useTelemetry } from '@/composables/useTelemetry';
import type {
	AddColumnResponse,
	DataTableColumn,
	DataTableColumnCreatePayload,
	DataTableRow,
} from '@/features/dataTable/dataTable.types';
import { ref, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type {
	CellKeyDownEvent,
	CellValueChangedEvent,
	ColDef,
	ColumnMovedEvent,
	GridApi,
} from 'ag-grid-community';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import { MODAL_CONFIRM } from '@/constants';
import { isDataTableValue, isAGGridCellType } from '@/features/dataTable/typeGuards';
import { useDataTableTypes } from '@/features/dataTable/composables/useDataTableTypes';
import { areValuesEqual } from '@/features/dataTable/utils/typeUtils';
import { ResponseError } from '@n8n/rest-api-client';

export type UseDataTableOperationsParams = {
	colDefs: Ref<ColDef[]>;
	rowData: Ref<DataTableRow[]>;
	deleteGridColumn: (columnId: string) => void;
	addGridColumn: (column: DataTableColumn) => void;
	setGridData: (params: {
		rowData?: DataTableRow[];
		colDefs?: ColDef[];
	}) => void;
	insertGridColumnAtIndex: (column: ColDef, index: number) => void;
	moveGridColumn: (oldIndex: number, newIndex: number) => void;
	dataTableId: string;
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
	currentFilterJSON?: Ref<string | undefined>;
	handleClearSelection: () => void;
	selectedRowIds: Ref<Set<number>>;
	handleCopyFocusedCell: (params: CellKeyDownEvent<DataTableRow>) => Promise<void>;
};

export const useDataTableOperations = ({
	colDefs,
	rowData,
	deleteGridColumn,
	addGridColumn,
	setGridData,
	insertGridColumnAtIndex,
	moveGridColumn,
	dataTableId,
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
	currentFilterJSON,
	handleClearSelection,
	selectedRowIds,
	handleCopyFocusedCell,
}: UseDataTableOperationsParams) => {
	const i18n = useI18n();
	const toast = useToast();
	const message = useMessage();
	const dataTableStore = useDataTableStore();
	const contentLoading = ref(false);
	const telemetry = useTelemetry();
	const dataTableTypes = useDataTableTypes();

	const getAddColumnError = (error: unknown): { httpStatus: number; message: string } => {
		const DEFAULT_HTTP_STATUS = 500;
		const DEFAULT_MESSAGE = i18n.baseText('generic.unknownError');

		if (error instanceof ResponseError) {
			return {
				httpStatus: error.httpStatusCode ?? 500,
				message: error.message,
			};
		}
		if (error instanceof Error) {
			return {
				httpStatus: DEFAULT_HTTP_STATUS,
				message: error.message,
			};
		}
		return {
			httpStatus: DEFAULT_HTTP_STATUS,
			message: DEFAULT_MESSAGE,
		};
	};

	async function onDeleteColumn(columnId: string) {
		const columnToDelete = colDefs.value.find((col) => col.colId === columnId);
		if (!columnToDelete) return;

		const promptResponse = await message.confirm(
			i18n.baseText('dataTable.deleteColumn.confirm.message', {
				interpolate: { name: columnToDelete.headerName ?? '' },
			}),
			i18n.baseText('dataTable.deleteColumn.confirm.title'),
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
		setGridData({ colDefs: colDefs.value, rowData: rowData.value });
		try {
			await dataTableStore.deleteDataTableColumn(dataTableId, projectId, columnId);
			telemetry.track('User deleted data table column', {
				column_id: columnId,
				column_type: columnToDelete.cellDataType,
				data_table_id: dataTableId,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.deleteColumn.error'));
			insertGridColumnAtIndex(columnToDelete, columnToDeleteIndex);
			rowData.value = rowDataOldValue;
			setGridData({ colDefs: colDefs.value, rowData: rowData.value });
		}
	}

	async function onAddColumn(column: DataTableColumnCreatePayload): Promise<AddColumnResponse> {
		try {
			const newColumn = await dataTableStore.addDataTableColumn(dataTableId, projectId, column);
			addGridColumn(newColumn);
			rowData.value = rowData.value.map((row) => {
				return { ...row, [newColumn.name]: null };
			});
			setGridData({ colDefs: colDefs.value, rowData: rowData.value });
			telemetry.track('User added data table column', {
				column_id: newColumn.id,
				column_type: newColumn.type,
				data_table_id: dataTableId,
			});
			return { success: true, httpStatus: 200 };
		} catch (error) {
			const addColumnError = getAddColumnError(error);
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
			await dataTableStore.moveDataTableColumn(
				dataTableId,
				projectId,
				moveEvent.column.getColId(),
				newIndex,
			);
			moveGridColumn(oldIndex, newIndex);
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.moveColumn.error'));
			gridApi.value.moveColumnByIndex(moveEvent.toIndex, oldIndex + 1);
		}
	};

	async function onAddRowClick() {
		try {
			await ensureItemOnPage(totalItems.value + 1);

			contentLoading.value = true;
			toggleSave(true);
			const insertedRow = await dataTableStore.insertEmptyRow(dataTableId, projectId);
			const newRow: DataTableRow = insertedRow;
			rowData.value.push(newRow);
			setTotalItems(totalItems.value + 1);
			setGridData({ rowData: rowData.value });
			focusFirstEditableCell(newRow.id as number);
			telemetry.track('User added row to data table', {
				data_table_id: dataTableId,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.addRow.error'));
		} finally {
			toggleSave(false);
			contentLoading.value = false;
		}
	}

	const onCellValueChanged = async (params: CellValueChangedEvent<DataTableRow>) => {
		const { data, api, oldValue, colDef } = params;
		const fieldName = String(colDef.field ?? '');
		if (!fieldName) return;

		const value = params.data[fieldName];

		const cellType = isAGGridCellType(colDef.cellDataType)
			? dataTableTypes.mapToDataTableColumnType(colDef.cellDataType)
			: undefined;

		if (value === undefined || areValuesEqual(oldValue, value, cellType)) {
			return;
		}

		if (typeof data.id !== 'number') {
			throw new Error('Expected row id to be a number');
		}
		const id = data.id;

		try {
			toggleSave(true);
			await dataTableStore.updateRow(dataTableId, projectId, id, {
				[fieldName]: value,
			});
			telemetry.track('User edited data table content', {
				data_table_id: dataTableId,
				column_id: colDef.colId,
				column_type: colDef.cellDataType,
			});
		} catch (error) {
			// Revert cell to original value if the update fails
			const validOldValue = isDataTableValue(oldValue) ? oldValue : null;
			const revertedData: DataTableRow = {
				...data,
				[fieldName]: validOldValue,
			};
			api.applyTransaction({
				update: [revertedData],
			});
			toast.showError(error, i18n.baseText('dataTable.updateRow.error'));
		} finally {
			toggleSave(false);
		}
	};

	async function fetchDataTableRows() {
		try {
			contentLoading.value = true;

			const fetchedRows = await dataTableStore.fetchDataTableContent(
				dataTableId,
				projectId,
				currentPage.value,
				pageSize.value,
				`${currentSortBy.value}:${currentSortOrder.value}`,
				currentFilterJSON?.value,
			);
			rowData.value = fetchedRows.data;
			setTotalItems(fetchedRows.count);
			setGridData({ rowData: rowData.value });
			handleClearSelection();
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.fetchContent.error'));
		} finally {
			contentLoading.value = false;
		}
	}

	const handleDeleteSelected = async () => {
		if (selectedRowIds.value.size === 0) return;

		const confirmResponse = await message.confirm(
			i18n.baseText('dataTable.deleteRows.confirmation', {
				adjustToNumber: selectedRowIds.value.size,
				interpolate: { count: selectedRowIds.value.size },
			}),
			i18n.baseText('dataTable.deleteRows.title'),
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
			await dataTableStore.deleteRows(dataTableId, projectId, idsToDelete);
			await fetchDataTableRows();

			telemetry.track('User deleted rows in data table', {
				data_table_id: dataTableId,
				deleted_row_count: idsToDelete.length,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.deleteRows.error'));
		} finally {
			toggleSave(false);
		}
	};

	const onCellKeyDown = async (params: CellKeyDownEvent<DataTableRow>) => {
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
		fetchDataTableRows,
		handleDeleteSelected,
		onCellKeyDown,
	};
};
