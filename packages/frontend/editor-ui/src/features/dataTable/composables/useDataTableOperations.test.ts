import {
	useDataTableOperations,
	type UseDataTableOperationsParams,
} from '@/features/dataTable/composables/useDataTableOperations';
import { ref } from 'vue';
import type {
	GridApi,
	ColumnMovedEvent,
	CellValueChangedEvent,
	CellKeyDownEvent,
} from 'ag-grid-community';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import { ResponseError } from '@n8n/rest-api-client';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useTelemetry } from '@/composables/useTelemetry';
import { MODAL_CONFIRM } from '@/constants';
import type { DataTableRow } from '@/features/dataTable/dataTable.types';

vi.mock('@/features/dataTable/dataTable.store', () => ({
	useDataTableStore: vi.fn(() => ({})),
}));

vi.mock('@/composables/useMessage', () => ({
	useMessage: vi.fn(() => ({
		confirm: vi.fn(),
	})),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: vi.fn(),
	})),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(() => ({
		baseText: vi.fn((key: string) => key),
	})),
}));

vi.mock('@/features/dataTable/composables/useDataTableTypes', () => ({
	useDataTableTypes: vi.fn(() => ({
		mapToDataTableColumnType: vi.fn(),
	})),
}));

vi.mock('@/features/dataTable/typeGuards', () => ({
	isDataTableValue: vi.fn((value: unknown) => value !== undefined && value !== null),
	isAGGridCellType: vi.fn(() => true),
}));

describe('useDataTableOperations', () => {
	let params: UseDataTableOperationsParams;
	let dataTableStore: ReturnType<typeof useDataTableStore>;
	let confirmMock: ReturnType<typeof vi.fn>;
	let showErrorMock: ReturnType<typeof vi.fn>;
	let telemetryTrackMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		dataTableStore = {
			addDataTableColumn: vi.fn(),
			deleteDataTableColumn: vi.fn(),
			moveDataTableColumn: vi.fn(),
			deleteRows: vi.fn(),
			insertEmptyRow: vi.fn(),
		} as unknown as ReturnType<typeof useDataTableStore>;

		vi.mocked(useDataTableStore).mockReturnValue(dataTableStore);

		confirmMock = vi.fn();
		vi.mocked(useMessage).mockReturnValue({
			confirm: confirmMock,
		} as unknown as ReturnType<typeof useMessage>);

		showErrorMock = vi.fn();
		vi.mocked(useToast).mockReturnValue({
			showError: showErrorMock,
		} as unknown as ReturnType<typeof useToast>);

		telemetryTrackMock = vi.fn();
		vi.mocked(useTelemetry).mockReturnValue({
			track: telemetryTrackMock,
		} as unknown as ReturnType<typeof useTelemetry>);

		params = {
			colDefs: ref([]),
			rowData: ref([]),
			deleteGridColumn: vi.fn(),
			addGridColumn: vi.fn(),
			setGridData: vi.fn(),
			insertGridColumnAtIndex: vi.fn(),
			moveGridColumn: vi.fn(),
			dataTableId: 'test',
			projectId: 'test',
			gridApi: ref(null as unknown as GridApi),
			totalItems: ref(0),
			setTotalItems: vi.fn(),
			ensureItemOnPage: vi.fn(),
			focusFirstEditableCell: vi.fn(),
			toggleSave: vi.fn(),
			currentPage: ref(1),
			pageSize: ref(10),
			currentSortBy: ref(''),
			currentSortOrder: ref(null),
			currentFilterJSON: ref(undefined),
			handleClearSelection: vi.fn(),
			selectedRowIds: ref(new Set()),
			handleCopyFocusedCell: vi.fn(),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('onAddColumn', () => {
		it('should add column when column is added successfully', async () => {
			const returnedColumn = { name: 'test', type: 'string' } as const;
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				addDataTableColumn: vi.fn().mockResolvedValue(returnedColumn),
			});
			const rowData = ref([{ id: 1 }]);
			const { onAddColumn } = useDataTableOperations({ ...params, rowData });
			const result = await onAddColumn({ name: returnedColumn.name, type: returnedColumn.type });
			expect(result.success).toBe(true);
			expect(result.httpStatus).toBe(200);
			expect(params.setGridData).toHaveBeenCalledWith({
				rowData: [{ id: 1, test: null }],
				colDefs: [],
			});
			expect(params.addGridColumn).toHaveBeenCalledWith(returnedColumn);
		});

		describe('error handling', () => {
			it('should handle ResponseError with httpStatusCode', async () => {
				const responseError = new ResponseError('Conflict error', { httpStatusCode: 409 });
				vi.mocked(useDataTableStore).mockReturnValue({
					...dataTableStore,
					addDataTableColumn: vi.fn().mockRejectedValue(responseError),
				});
				const { onAddColumn } = useDataTableOperations(params);
				const result = await onAddColumn({ name: 'test', type: 'string' });
				expect(result.success).toBe(false);
				expect(result.httpStatus).toBe(409);
				expect(result.errorMessage).toBe('Conflict error');
			});

			it('should handle ResponseError without httpStatusCode', async () => {
				const responseError = new ResponseError('Unknown response error');
				vi.mocked(useDataTableStore).mockReturnValue({
					...dataTableStore,
					addDataTableColumn: vi.fn().mockRejectedValue(responseError),
				});
				const { onAddColumn } = useDataTableOperations(params);
				const result = await onAddColumn({ name: 'test', type: 'string' });
				expect(result.success).toBe(false);
				expect(result.httpStatus).toBe(500);
				expect(result.errorMessage).toBe('Unknown response error');
			});

			it('should handle regular Error', async () => {
				const error = new Error('Regular error message');
				vi.mocked(useDataTableStore).mockReturnValue({
					...dataTableStore,
					addDataTableColumn: vi.fn().mockRejectedValue(error),
				});
				const { onAddColumn } = useDataTableOperations(params);
				const result = await onAddColumn({ name: 'test', type: 'string' });
				expect(result.success).toBe(false);
				expect(result.httpStatus).toBe(500);
				expect(result.errorMessage).toBe('Regular error message');
			});

			it('should handle unknown error type', async () => {
				const unknownError = 'string error';
				vi.mocked(useDataTableStore).mockReturnValue({
					...dataTableStore,
					addDataTableColumn: vi.fn().mockRejectedValue(unknownError),
				});
				const { onAddColumn } = useDataTableOperations(params);
				const result = await onAddColumn({ name: 'test', type: 'string' });
				expect(result.success).toBe(false);
				expect(result.httpStatus).toBe(500);
				expect(result.errorMessage).toBe('generic.unknownError');
			});
		});
	});

	describe('onDeleteColumn', () => {
		it('should return early when column is not found', async () => {
			const colDefs = ref([]);
			const { onDeleteColumn } = useDataTableOperations({ ...params, colDefs });
			await onDeleteColumn('non-existent-column');

			expect(confirmMock).not.toHaveBeenCalled();
		});

		it('should return early when user cancels confirmation', async () => {
			confirmMock.mockResolvedValue('cancel');

			const colDefs = ref([
				{ colId: 'col1', field: 'name', headerName: 'Name', cellDataType: 'text' },
			]);

			const { onDeleteColumn } = useDataTableOperations({ ...params, colDefs });
			await onDeleteColumn('col1');

			expect(confirmMock).toHaveBeenCalled();
			expect(params.deleteGridColumn).not.toHaveBeenCalled();
		});

		it('should delete column successfully when user confirms', async () => {
			confirmMock.mockResolvedValue(MODAL_CONFIRM);

			const deleteDataTableColumnMock = vi.fn().mockResolvedValue(undefined);
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				deleteDataTableColumn: deleteDataTableColumnMock,
			});

			const colDefs = ref([
				{ colId: 'col1', field: 'name', headerName: 'Name', cellDataType: 'text' },
			]);
			const rowData = ref([
				{ id: 1, name: 'John' },
				{ id: 2, name: 'Jane' },
			]);

			const { onDeleteColumn } = useDataTableOperations({ ...params, colDefs, rowData });
			await onDeleteColumn('col1');

			expect(confirmMock).toHaveBeenCalled();
			expect(params.deleteGridColumn).toHaveBeenCalledWith('col1');
			expect(params.setGridData).toHaveBeenCalledWith({
				colDefs: colDefs.value,
				rowData: [{ id: 1 }, { id: 2 }],
			});
			expect(deleteDataTableColumnMock).toHaveBeenCalledWith('test', 'test', 'col1');
			expect(telemetryTrackMock).toHaveBeenCalledWith('User deleted data table column', {
				column_id: 'col1',
				column_type: 'text',
				data_table_id: 'test',
			});
		});

		it('should rollback changes when deletion fails', async () => {
			confirmMock.mockResolvedValue(MODAL_CONFIRM);

			const deleteError = new Error('Delete failed');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				deleteDataTableColumn: vi.fn().mockRejectedValue(deleteError),
			});

			const colDefToDelete = {
				colId: 'col1',
				field: 'name',
				headerName: 'Name',
				cellDataType: 'text',
			};
			const colDefs = ref([colDefToDelete]);
			const rowData = ref([
				{ id: 1, name: 'John' },
				{ id: 2, name: 'Jane' },
			]);

			const { onDeleteColumn } = useDataTableOperations({ ...params, colDefs, rowData });
			await onDeleteColumn('col1');

			expect(params.deleteGridColumn).toHaveBeenCalledWith('col1');
			expect(showErrorMock).toHaveBeenCalledWith(deleteError, 'dataTable.deleteColumn.error');
			expect(params.insertGridColumnAtIndex).toHaveBeenCalledWith(colDefToDelete, 0);
			expect(rowData.value).toEqual([
				{ id: 1, name: 'John' },
				{ id: 2, name: 'Jane' },
			]);
			expect(params.setGridData).toHaveBeenCalledTimes(2);
		});
	});

	describe('onColumnMoved', () => {
		const createMockColumn = (colId: string) => ({
			getColId: () => colId,
		});

		it('should return early when event is not finished', async () => {
			const { onColumnMoved } = useDataTableOperations(params);
			const moveEvent = {
				finished: false,
				source: 'uiColumnMoved',
				toIndex: 2,
				column: createMockColumn('col1'),
			} as unknown as ColumnMovedEvent;

			await onColumnMoved(moveEvent);

			expect(params.moveGridColumn).not.toHaveBeenCalled();
		});

		it('should return early when source is not uiColumnMoved', async () => {
			const { onColumnMoved } = useDataTableOperations(params);
			const moveEvent = {
				finished: true,
				source: 'api',
				toIndex: 2,
				column: createMockColumn('col1'),
			} as unknown as ColumnMovedEvent;

			await onColumnMoved(moveEvent);

			expect(params.moveGridColumn).not.toHaveBeenCalled();
		});

		it('should return early when toIndex is undefined', async () => {
			const { onColumnMoved } = useDataTableOperations(params);
			const moveEvent = {
				finished: true,
				source: 'uiColumnMoved',
				toIndex: undefined,
				column: createMockColumn('col1'),
			} as unknown as ColumnMovedEvent;

			await onColumnMoved(moveEvent);

			expect(params.moveGridColumn).not.toHaveBeenCalled();
		});

		it('should return early when column is not provided', async () => {
			const { onColumnMoved } = useDataTableOperations(params);
			const moveEvent = {
				finished: true,
				source: 'uiColumnMoved',
				toIndex: 2,
				column: null,
			} as unknown as ColumnMovedEvent;

			await onColumnMoved(moveEvent);

			expect(params.moveGridColumn).not.toHaveBeenCalled();
		});

		it('should move column successfully', async () => {
			const moveDataTableColumnMock = vi.fn().mockResolvedValue(undefined);
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				moveDataTableColumn: moveDataTableColumnMock,
			});

			const colDefs = ref([
				{ colId: 'col1', field: 'name' },
				{ colId: 'col2', field: 'age' },
				{ colId: 'col3', field: 'email' },
			]);

			const { onColumnMoved } = useDataTableOperations({ ...params, colDefs });
			const moveEvent = {
				finished: true,
				source: 'uiColumnMoved',
				toIndex: 4, // AG Grid includes selection and id columns, so actual index is 4-2=2
				column: createMockColumn('col1'),
			} as unknown as ColumnMovedEvent;

			await onColumnMoved(moveEvent);

			expect(moveDataTableColumnMock).toHaveBeenCalledWith('test', 'test', 'col1', 2);
			expect(params.moveGridColumn).toHaveBeenCalledWith(0, 2);
		});

		it('should rollback move when API call fails', async () => {
			const moveError = new Error('Move failed');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				moveDataTableColumn: vi.fn().mockRejectedValue(moveError),
			});

			const moveColumnByIndex = vi.fn();
			const gridApi = ref({
				moveColumnByIndex,
			} as unknown as GridApi);

			const colDefs = ref([
				{ colId: 'col1', field: 'name' },
				{ colId: 'col2', field: 'age' },
			]);

			const { onColumnMoved } = useDataTableOperations({ ...params, colDefs, gridApi });
			const moveEvent = {
				finished: true,
				source: 'uiColumnMoved',
				toIndex: 3,
				column: createMockColumn('col1'),
			} as unknown as ColumnMovedEvent;

			await onColumnMoved(moveEvent);

			expect(showErrorMock).toHaveBeenCalledWith(moveError, 'dataTable.moveColumn.error');
			expect(moveColumnByIndex).toHaveBeenCalledWith(3, 1); // oldIndex (0) + 1
			expect(params.moveGridColumn).not.toHaveBeenCalled();
		});
	});

	describe('onAddRowClick', () => {
		it('should add row successfully', async () => {
			const insertEmptyRowMock = vi.fn().mockResolvedValue({ id: 123, name: null });
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				insertEmptyRow: insertEmptyRowMock,
			});

			const rowData = ref([{ id: 1 }, { id: 2 }]);
			const totalItems = ref(2);

			const { onAddRowClick, contentLoading } = useDataTableOperations({
				...params,
				rowData,
				totalItems,
			});

			await onAddRowClick();

			expect(params.ensureItemOnPage).toHaveBeenCalledWith(3);
			expect(params.toggleSave).toHaveBeenCalledWith(true);
			expect(insertEmptyRowMock).toHaveBeenCalledWith('test', 'test');
			expect(rowData.value).toHaveLength(3);
			expect(rowData.value[2]).toEqual({ id: 123, name: null });
			expect(params.setTotalItems).toHaveBeenCalledWith(3);
			expect(params.setGridData).toHaveBeenCalledWith({ rowData: rowData.value });
			expect(params.focusFirstEditableCell).toHaveBeenCalledWith(123);
			expect(telemetryTrackMock).toHaveBeenCalledWith('User added row to data table', {
				data_table_id: 'test',
			});
			expect(params.toggleSave).toHaveBeenCalledWith(false);
			expect(contentLoading.value).toBe(false);
		});

		it('should handle error and show toast', async () => {
			const addRowError = new Error('Failed to add row');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				insertEmptyRow: vi.fn().mockRejectedValue(addRowError),
			});

			const rowData = ref([{ id: 1 }]);
			const totalItems = ref(1);

			const { onAddRowClick } = useDataTableOperations({
				...params,
				rowData,
				totalItems,
			});

			await onAddRowClick();

			expect(showErrorMock).toHaveBeenCalledWith(addRowError, 'dataTable.addRow.error');
			expect(rowData.value).toHaveLength(1);
			expect(params.setTotalItems).not.toHaveBeenCalled();
			expect(params.focusFirstEditableCell).not.toHaveBeenCalled();
		});

		it('should always reset loading state in finally block', async () => {
			const addRowError = new Error('Failed to add row');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				insertEmptyRow: vi.fn().mockRejectedValue(addRowError),
			});

			const { onAddRowClick, contentLoading } = useDataTableOperations(params);

			await onAddRowClick();

			expect(params.toggleSave).toHaveBeenCalledWith(true);
			expect(params.toggleSave).toHaveBeenCalledWith(false);
			expect(contentLoading.value).toBe(false);
		});
	});

	describe('onCellValueChanged', () => {
		it('should return early when field name is empty', async () => {
			const { onCellValueChanged } = useDataTableOperations(params);
			const event = {
				data: { id: 1 },
				api: { applyTransaction: vi.fn() },
				oldValue: 'old',
				colDef: { field: '', cellDataType: 'text' },
			} as unknown as CellValueChangedEvent<DataTableRow>;

			await onCellValueChanged(event);

			expect(params.toggleSave).not.toHaveBeenCalled();
		});

		it('should return early when value is undefined', async () => {
			const { onCellValueChanged } = useDataTableOperations(params);
			const event = {
				data: { id: 1 },
				api: { applyTransaction: vi.fn() },
				oldValue: 'old',
				colDef: { field: 'name', cellDataType: 'text' },
			} as unknown as CellValueChangedEvent<DataTableRow>;

			await onCellValueChanged(event);

			expect(params.toggleSave).not.toHaveBeenCalled();
		});

		it('should return early when values are equal', async () => {
			const { onCellValueChanged } = useDataTableOperations(params);
			const event = {
				data: { id: 1, name: 'John' },
				api: { applyTransaction: vi.fn() },
				oldValue: 'John',
				colDef: { field: 'name', cellDataType: 'text' },
			} as unknown as CellValueChangedEvent<DataTableRow>;

			await onCellValueChanged(event);

			expect(params.toggleSave).not.toHaveBeenCalled();
		});

		it('should throw error when row id is not a number', async () => {
			const { onCellValueChanged } = useDataTableOperations(params);
			const event = {
				data: { id: 'not-a-number', name: 'Jane' },
				api: { applyTransaction: vi.fn() },
				oldValue: 'John',
				colDef: { field: 'name', cellDataType: 'text' },
			} as unknown as CellValueChangedEvent<DataTableRow>;

			await expect(onCellValueChanged(event)).rejects.toThrow('Expected row id to be a number');
		});

		it('should update cell value successfully', async () => {
			const updateRowMock = vi.fn().mockResolvedValue(undefined);
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				updateRow: updateRowMock,
			});

			const { onCellValueChanged } = useDataTableOperations(params);
			const event = {
				data: { id: 1, name: 'Jane' },
				api: { applyTransaction: vi.fn() },
				oldValue: 'John',
				colDef: { field: 'name', cellDataType: 'text', colId: 'col1' },
			} as unknown as CellValueChangedEvent<DataTableRow>;

			await onCellValueChanged(event);

			expect(params.toggleSave).toHaveBeenCalledWith(true);
			expect(updateRowMock).toHaveBeenCalledWith('test', 'test', 1, { name: 'Jane' });
			expect(telemetryTrackMock).toHaveBeenCalledWith('User edited data table content', {
				data_table_id: 'test',
				column_id: 'col1',
				column_type: 'text',
			});
			expect(params.toggleSave).toHaveBeenCalledWith(false);
		});

		it('should revert cell value when update fails', async () => {
			const isDataTableValue = await import('@/features/dataTable/typeGuards').then(
				(m) => m.isDataTableValue,
			);
			vi.mocked(isDataTableValue).mockReturnValue(true);

			const updateError = new Error('Update failed');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				updateRow: vi.fn().mockRejectedValue(updateError),
			});

			const applyTransaction = vi.fn();
			const { onCellValueChanged } = useDataTableOperations(params);
			const event = {
				data: { id: 1, name: 'Jane' },
				api: { applyTransaction },
				oldValue: 'John',
				colDef: { field: 'name', cellDataType: 'text', colId: 'col1' },
			} as unknown as CellValueChangedEvent<DataTableRow>;

			await onCellValueChanged(event);

			expect(applyTransaction).toHaveBeenCalledWith({
				update: [{ id: 1, name: 'John' }],
			});
			expect(showErrorMock).toHaveBeenCalledWith(updateError, 'dataTable.updateRow.error');
			expect(params.toggleSave).toHaveBeenCalledWith(false);
		});

		it('should revert cell value to null when old value is invalid', async () => {
			const isDataTableValue = await import('@/features/dataTable/typeGuards').then(
				(m) => m.isDataTableValue,
			);
			vi.mocked(isDataTableValue).mockReturnValue(false);

			const updateError = new Error('Update failed');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				updateRow: vi.fn().mockRejectedValue(updateError),
			});

			const applyTransaction = vi.fn();
			const { onCellValueChanged } = useDataTableOperations(params);
			const event = {
				data: { id: 1, name: 'Jane' },
				api: { applyTransaction },
				oldValue: undefined,
				colDef: { field: 'name', cellDataType: 'text', colId: 'col1' },
			} as unknown as CellValueChangedEvent<DataTableRow>;

			await onCellValueChanged(event);

			expect(applyTransaction).toHaveBeenCalledWith({
				update: [{ id: 1, name: null }],
			});
			expect(showErrorMock).toHaveBeenCalledWith(updateError, 'dataTable.updateRow.error');
		});
	});

	describe('fetchDataTableRows', () => {
		it('should fetch rows successfully', async () => {
			const fetchedData = {
				data: [
					{ id: 1, name: 'John' },
					{ id: 2, name: 'Jane' },
				],
				count: 10,
			};

			const fetchDataTableContentMock = vi.fn().mockResolvedValue(fetchedData);
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				fetchDataTableContent: fetchDataTableContentMock,
			});

			const rowData = ref([]);
			const currentPage = ref(2);
			const pageSize = ref(20);
			const currentSortBy = ref('name');
			const currentSortOrder = ref('asc');
			const currentFilterJSON = ref('{"status":"active"}');

			const { fetchDataTableRows, contentLoading } = useDataTableOperations({
				...params,
				rowData,
				currentPage,
				pageSize,
				currentSortBy,
				currentSortOrder,
				currentFilterJSON,
			});

			await fetchDataTableRows();

			expect(fetchDataTableContentMock).toHaveBeenCalledWith(
				'test',
				'test',
				2,
				20,
				'name:asc',
				'{"status":"active"}',
			);
			expect(rowData.value).toEqual(fetchedData.data);
			expect(params.setTotalItems).toHaveBeenCalledWith(10);
			expect(params.setGridData).toHaveBeenCalledWith({ rowData: fetchedData.data });
			expect(params.handleClearSelection).toHaveBeenCalled();
			expect(contentLoading.value).toBe(false);
		});

		it('should handle undefined currentFilterJSON', async () => {
			const fetchedData = {
				data: [{ id: 1 }],
				count: 1,
			};

			const fetchDataTableContentMock = vi.fn().mockResolvedValue(fetchedData);
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				fetchDataTableContent: fetchDataTableContentMock,
			});

			const currentPage = ref(1);
			const pageSize = ref(10);
			const currentSortBy = ref('id');
			const currentSortOrder = ref('desc');

			const { fetchDataTableRows } = useDataTableOperations({
				...params,
				currentPage,
				pageSize,
				currentSortBy,
				currentSortOrder,
			});

			await fetchDataTableRows();

			expect(fetchDataTableContentMock).toHaveBeenCalledWith(
				'test',
				'test',
				1,
				10,
				'id:desc',
				undefined,
			);
		});

		it('should handle error and show toast', async () => {
			const fetchError = new Error('Failed to fetch');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				fetchDataTableContent: vi.fn().mockRejectedValue(fetchError),
			});

			const rowData = ref([{ id: 1 }]);

			const { fetchDataTableRows } = useDataTableOperations({ ...params, rowData });

			await fetchDataTableRows();

			expect(showErrorMock).toHaveBeenCalledWith(fetchError, 'dataTable.fetchContent.error');
			expect(rowData.value).toEqual([{ id: 1 }]);
			expect(params.setTotalItems).not.toHaveBeenCalled();
			expect(params.handleClearSelection).not.toHaveBeenCalled();
		});

		it('should always reset loading state in finally block', async () => {
			const fetchError = new Error('Failed to fetch');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				fetchDataTableContent: vi.fn().mockRejectedValue(fetchError),
			});

			const { fetchDataTableRows, contentLoading } = useDataTableOperations(params);

			await fetchDataTableRows();

			expect(contentLoading.value).toBe(false);
		});
	});

	describe('handleDeleteSelected', () => {
		it('should return early when no rows are selected', async () => {
			const selectedRowIds = ref(new Set<number>());
			const { handleDeleteSelected } = useDataTableOperations({ ...params, selectedRowIds });

			await handleDeleteSelected();

			expect(confirmMock).not.toHaveBeenCalled();
		});

		it('should return early when user cancels confirmation', async () => {
			confirmMock.mockResolvedValue('cancel');

			const selectedRowIds = ref(new Set([1, 2, 3]));
			const { handleDeleteSelected } = useDataTableOperations({ ...params, selectedRowIds });

			await handleDeleteSelected();

			expect(confirmMock).toHaveBeenCalled();
			expect(params.toggleSave).not.toHaveBeenCalled();
		});

		it('should delete selected rows successfully', async () => {
			confirmMock.mockResolvedValue(MODAL_CONFIRM);

			const deleteRowsMock = vi.fn().mockResolvedValue(undefined);
			const fetchDataTableContentMock = vi.fn().mockResolvedValue({
				data: [],
				count: 0,
			});
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				deleteRows: deleteRowsMock,
				fetchDataTableContent: fetchDataTableContentMock,
			});

			const selectedRowIds = ref(new Set([1, 2, 3]));
			const { handleDeleteSelected } = useDataTableOperations({ ...params, selectedRowIds });

			await handleDeleteSelected();

			expect(params.toggleSave).toHaveBeenCalledWith(true);
			expect(deleteRowsMock).toHaveBeenCalledWith('test', 'test', [1, 2, 3]);
			expect(fetchDataTableContentMock).toHaveBeenCalled();
			expect(telemetryTrackMock).toHaveBeenCalledWith('User deleted rows in data table', {
				data_table_id: 'test',
				deleted_row_count: 3,
			});
			expect(params.toggleSave).toHaveBeenCalledWith(false);
		});

		it('should handle error and show toast', async () => {
			confirmMock.mockResolvedValue(MODAL_CONFIRM);

			const deleteError = new Error('Delete failed');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				deleteRows: vi.fn().mockRejectedValue(deleteError),
			});

			const selectedRowIds = ref(new Set([1, 2]));
			const { handleDeleteSelected } = useDataTableOperations({ ...params, selectedRowIds });

			await handleDeleteSelected();

			expect(showErrorMock).toHaveBeenCalledWith(deleteError, 'dataTable.deleteRows.error');
			expect(params.toggleSave).toHaveBeenCalledWith(false);
		});

		it('should always reset save state in finally block', async () => {
			confirmMock.mockResolvedValue(MODAL_CONFIRM);

			const deleteError = new Error('Delete failed');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				deleteRows: vi.fn().mockRejectedValue(deleteError),
			});

			const selectedRowIds = ref(new Set([1]));
			const { handleDeleteSelected } = useDataTableOperations({ ...params, selectedRowIds });

			await handleDeleteSelected();

			expect(params.toggleSave).toHaveBeenCalledWith(true);
			expect(params.toggleSave).toHaveBeenCalledWith(false);
		});
	});

	describe('onCellKeyDown', () => {
		const createKeyDownEvent = (
			key: string,
			options: { metaKey?: boolean; ctrlKey?: boolean; target?: HTMLElement } = {},
		): CellKeyDownEvent<DataTableRow> => {
			const preventDefault = vi.fn();
			return {
				event: {
					key,
					metaKey: options.metaKey || false,
					ctrlKey: options.ctrlKey || false,
					target: options.target || document.createElement('div'),
					preventDefault,
				} as unknown as KeyboardEvent,
				column: { getColId: () => 'col1' },
				api: { getEditingCells: () => [] },
			} as unknown as CellKeyDownEvent<DataTableRow>;
		};

		it('should return early when cells are being edited', async () => {
			const { onCellKeyDown } = useDataTableOperations(params);
			const event = createKeyDownEvent('Delete');
			event.api.getEditingCells = () => [
				{
					rowIndex: 0,
					column: {},
				} as unknown as ReturnType<GridApi['getEditingCells']>[0],
			];

			await onCellKeyDown(event);

			expect(params.handleCopyFocusedCell).not.toHaveBeenCalled();
			expect(params.handleClearSelection).not.toHaveBeenCalled();
		});

		it('should return early when target is input element in non-selection column', async () => {
			const { onCellKeyDown } = useDataTableOperations(params);
			const input = document.createElement('input');
			const event = createKeyDownEvent('Delete', { target: input });

			await onCellKeyDown(event);

			expect(params.handleClearSelection).not.toHaveBeenCalled();
		});

		it('should handle Cmd+C copy shortcut', async () => {
			const { onCellKeyDown } = useDataTableOperations(params);
			const event = createKeyDownEvent('c', { metaKey: true });

			await onCellKeyDown(event);

			expect(event.event?.preventDefault).toHaveBeenCalled();
			expect(params.handleCopyFocusedCell).toHaveBeenCalledWith(event);
		});

		it('should handle Ctrl+C copy shortcut', async () => {
			const { onCellKeyDown } = useDataTableOperations(params);
			const event = createKeyDownEvent('c', { ctrlKey: true });

			await onCellKeyDown(event);

			expect(event.event?.preventDefault).toHaveBeenCalled();
			expect(params.handleCopyFocusedCell).toHaveBeenCalledWith(event);
		});

		it('should handle Escape key', async () => {
			const { onCellKeyDown } = useDataTableOperations(params);
			const event = createKeyDownEvent('Escape');

			await onCellKeyDown(event);

			expect(params.handleClearSelection).toHaveBeenCalled();
		});

		it('should handle Delete key when rows are selected', async () => {
			confirmMock.mockResolvedValue(MODAL_CONFIRM);
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				deleteRows: vi.fn().mockResolvedValue(undefined),
				fetchDataTableContent: vi.fn().mockResolvedValue({ data: [], count: 0 }),
			});

			const selectedRowIds = ref(new Set([1, 2]));
			const { onCellKeyDown } = useDataTableOperations({ ...params, selectedRowIds });
			const event = createKeyDownEvent('Delete');

			await onCellKeyDown(event);

			expect(event.event?.preventDefault).toHaveBeenCalled();
			expect(confirmMock).toHaveBeenCalled();
		});

		it('should handle Backspace key when rows are selected', async () => {
			confirmMock.mockResolvedValue(MODAL_CONFIRM);
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				deleteRows: vi.fn().mockResolvedValue(undefined),
				fetchDataTableContent: vi.fn().mockResolvedValue({ data: [], count: 0 }),
			});

			const selectedRowIds = ref(new Set([3]));
			const { onCellKeyDown } = useDataTableOperations({ ...params, selectedRowIds });
			const event = createKeyDownEvent('Backspace');

			await onCellKeyDown(event);

			expect(event.event?.preventDefault).toHaveBeenCalled();
			expect(confirmMock).toHaveBeenCalled();
		});

		it('should not handle Delete key when no rows are selected', async () => {
			const selectedRowIds = ref(new Set<number>());
			const { onCellKeyDown } = useDataTableOperations({ ...params, selectedRowIds });
			const event = createKeyDownEvent('Delete');

			await onCellKeyDown(event);

			expect(event.event?.preventDefault).not.toHaveBeenCalled();
			expect(confirmMock).not.toHaveBeenCalled();
		});

		it('should not handle other keys', async () => {
			const { onCellKeyDown } = useDataTableOperations(params);
			const event = createKeyDownEvent('a');

			await onCellKeyDown(event);

			expect(params.handleCopyFocusedCell).not.toHaveBeenCalled();
			expect(params.handleClearSelection).not.toHaveBeenCalled();
			expect(confirmMock).not.toHaveBeenCalled();
		});
	});
});
