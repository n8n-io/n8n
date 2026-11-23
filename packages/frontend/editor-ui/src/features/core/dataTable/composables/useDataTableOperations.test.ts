import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import {
	useDataTableOperations,
	type UseDataTableOperationsParams,
} from '@/features/core/dataTable/composables/useDataTableOperations';
import type { DataTableColumn, DataTableRow } from '@/features/core/dataTable/dataTable.types';
import { MODAL_CONFIRM } from '@/app/constants';

const { store, confirm, showError, showMessage, track } = vi.hoisted(() => ({
	store: {
		addDataTableColumn: vi.fn(),
		deleteDataTableColumn: vi.fn(),
		moveDataTableColumn: vi.fn(),
		renameDataTableColumn: vi.fn(),
		insertEmptyRow: vi.fn(),
		updateRow: vi.fn(),
		fetchDataTableContent: vi.fn(),
		deleteRows: vi.fn(),
	},
	confirm: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
	track: vi.fn(),
}));

vi.mock('@/features/core/dataTable/dataTable.store', () => ({
	useDataTableStore: () => store,
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const DATA_TABLE_ID = 'data-table-1';
const PROJECT_ID = 'project-1';

const createColumns = (): DataTableColumn[] => [
	{ id: 'col-name', name: 'name', type: 'string', index: 0 },
	{ id: 'col-age', name: 'age', type: 'number', index: 1 },
	{ id: 'col-active', name: 'active', type: 'boolean', index: 2 },
];

const createRows = (): DataTableRow[] => [
	{ id: 1, name: 'John', age: 30, active: true },
	{ id: 2, name: 'Jane', age: 25, active: false },
];

const createParams = (
	overrides: Partial<UseDataTableOperationsParams> = {},
): UseDataTableOperationsParams => ({
	dataTableId: DATA_TABLE_ID,
	projectId: PROJECT_ID,
	rows: ref(createRows()),
	columns: ref(createColumns()),
	totalItems: ref(2),
	setTotalItems: vi.fn(),
	ensureItemOnPage: vi.fn(),
	currentPage: ref(1),
	pageSize: ref(10),
	sortBy: ref(''),
	filterJSON: ref(undefined),
	searchQuery: ref(undefined),
	schemaReadOnly: ref(false),
	clearSelection: vi.fn(),
	focusRow: vi.fn(),
	toggleSave: vi.fn(),
	...overrides,
});

const setup = (overrides: Partial<UseDataTableOperationsParams> = {}) => {
	const params = createParams(overrides);
	return { params, ...useDataTableOperations(params) };
};

const columnOrder = (columns: DataTableColumn[]) =>
	[...columns].sort((a, b) => a.index - b.index).map((column) => column.id);

const expectSaveToggled = (params: UseDataTableOperationsParams) => {
	expect(params.toggleSave).toHaveBeenNthCalledWith(1, true);
	expect(params.toggleSave).toHaveBeenLastCalledWith(false);
};

describe('useDataTableOperations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		confirm.mockResolvedValue(MODAL_CONFIRM);
	});

	describe('read-only schema', () => {
		it('should not change columns when the schema is read-only', async () => {
			const { params, onAddColumn, onRenameColumn, onDeleteColumn, onColumnMove } = setup({
				schemaReadOnly: ref(true),
			});

			expect(await onAddColumn({ name: 'description', type: 'string' })).toEqual({
				success: false,
			});
			await onRenameColumn('col-name', 'title');
			await onDeleteColumn('col-name');
			await onColumnMove({ columnId: 'col-name', toIndex: 3 });

			expect(store.addDataTableColumn).not.toHaveBeenCalled();
			expect(store.renameDataTableColumn).not.toHaveBeenCalled();
			expect(store.deleteDataTableColumn).not.toHaveBeenCalled();
			expect(store.moveDataTableColumn).not.toHaveBeenCalled();
			expect(confirm).not.toHaveBeenCalled();
			expect(params.columns.value).toEqual(createColumns());
			expect(params.rows.value).toEqual(createRows());
		});

		it('should not delete the column when the schema becomes read-only during confirmation', async () => {
			const confirmation = createDeferredPromise<typeof MODAL_CONFIRM>();
			confirm.mockReturnValue(confirmation.promise);
			const { params, onDeleteColumn } = setup();

			const deletion = onDeleteColumn('col-name');
			params.schemaReadOnly.value = true;
			confirmation.resolve(MODAL_CONFIRM);
			await deletion;

			expect(store.deleteDataTableColumn).not.toHaveBeenCalled();
			expect(params.columns.value).toEqual(createColumns());
		});

		it('should still allow row changes when the schema is read-only', async () => {
			store.insertEmptyRow.mockResolvedValue({ id: 3 });
			const { onAddRowClick, onCellEdit } = setup({ schemaReadOnly: ref(true) });

			await onAddRowClick();
			await onCellEdit({ rowKey: '1', field: 'name', oldValue: 'John', newValue: 'Jim' });

			expect(store.insertEmptyRow).toHaveBeenCalled();
			expect(store.updateRow).toHaveBeenCalled();
		});
	});

	describe('onDeleteColumn', () => {
		it('should not ask for confirmation when the column does not exist', async () => {
			const { onDeleteColumn } = setup();

			await onDeleteColumn('missing');

			expect(confirm).not.toHaveBeenCalled();
			expect(store.deleteDataTableColumn).not.toHaveBeenCalled();
		});

		it('should keep the column when the user cancels the confirmation', async () => {
			confirm.mockResolvedValue('cancel');
			const { params, onDeleteColumn } = setup();

			await onDeleteColumn('col-name');

			expect(confirm).toHaveBeenCalledWith(
				'dataTable.deleteColumn.confirm.message',
				'dataTable.deleteColumn.confirm.title',
				{ confirmButtonText: 'generic.delete', cancelButtonText: 'generic.cancel' },
			);
			expect(store.deleteDataTableColumn).not.toHaveBeenCalled();
			expect(params.columns.value).toEqual(createColumns());
		});

		it('should remove the column and its row values when the deletion succeeds', async () => {
			store.deleteDataTableColumn.mockResolvedValue(undefined);
			const { params, onDeleteColumn } = setup();

			await onDeleteColumn('col-name');

			expect(store.deleteDataTableColumn).toHaveBeenCalledWith(
				DATA_TABLE_ID,
				PROJECT_ID,
				'col-name',
			);
			expect(params.columns.value.map((column) => column.id)).toEqual(['col-age', 'col-active']);
			expect(params.rows.value).toEqual([
				{ id: 1, age: 30, active: true },
				{ id: 2, age: 25, active: false },
			]);
			expect(track).toHaveBeenCalledWith('User deleted data table column', {
				column_id: 'col-name',
				column_type: 'text',
				data_table_id: DATA_TABLE_ID,
			});
		});

		it('should restore the column and its row values when the deletion fails', async () => {
			const error = new Error('Delete failed');
			store.deleteDataTableColumn.mockRejectedValue(error);
			const { params, onDeleteColumn } = setup();

			await onDeleteColumn('col-name');

			expect(showError).toHaveBeenCalledWith(error, 'dataTable.deleteColumn.error');
			expect(params.columns.value).toEqual(createColumns());
			expect(params.rows.value).toEqual(createRows());
			expect(track).not.toHaveBeenCalled();
		});
	});

	describe('onRenameColumn', () => {
		it('should rename the column and the field in each row', async () => {
			store.renameDataTableColumn.mockResolvedValue(undefined);
			const { params, onRenameColumn } = setup();

			await onRenameColumn('col-name', 'title');

			expect(store.renameDataTableColumn).toHaveBeenCalledWith(
				DATA_TABLE_ID,
				PROJECT_ID,
				'col-name',
				'title',
			);
			expect(params.columns.value[0]).toEqual({
				id: 'col-name',
				name: 'title',
				type: 'string',
				index: 0,
			});
			expect(params.rows.value).toEqual([
				{ id: 1, title: 'John', age: 30, active: true },
				{ id: 2, title: 'Jane', age: 25, active: false },
			]);
			expect(track).toHaveBeenCalledWith('User renamed data table column', {
				column_id: 'col-name',
				column_type: 'text',
				data_table_id: DATA_TABLE_ID,
			});
			expectSaveToggled(params);
		});

		it('should set the renamed field to null in rows that do not have it', async () => {
			const { params, onRenameColumn } = setup({ rows: ref([{ id: 1 }]) });

			await onRenameColumn('col-name', 'title');

			expect(params.rows.value).toEqual([{ id: 1, title: null }]);
		});

		it('should keep each rename when several columns are renamed in sequence', async () => {
			const { params, onRenameColumn } = setup();

			await onRenameColumn('col-name', 'title');
			await onRenameColumn('col-age', 'years');

			expect(params.columns.value.map((column) => column.name)).toEqual([
				'title',
				'years',
				'active',
			]);
			expect(params.rows.value[0]).toEqual({ id: 1, title: 'John', years: 30, active: true });
		});

		it.each([
			['the column does not exist', 'missing', 'title'],
			['the name does not change', 'col-name', 'name'],
		])('should not call the store when %s', async (_, columnId, newName) => {
			const { params, onRenameColumn } = setup();

			await onRenameColumn(columnId, newName);

			expect(store.renameDataTableColumn).not.toHaveBeenCalled();
			expect(params.columns.value).toEqual(createColumns());
		});

		it('should restore the column and rows when the rename fails', async () => {
			const error = new Error('Rename failed');
			store.renameDataTableColumn.mockRejectedValue(error);
			const { params, onRenameColumn } = setup();

			await onRenameColumn('col-name', 'title');

			expect(params.columns.value).toEqual(createColumns());
			expect(params.rows.value).toEqual(createRows());
			expect(showError).toHaveBeenCalledWith(error, 'dataTable.renameColumn.error');
			expect(track).not.toHaveBeenCalled();
			expectSaveToggled(params);
		});

		it('should show the duplicate name message when the rename conflicts with an existing column', async () => {
			store.renameDataTableColumn.mockRejectedValue(
				new ResponseError('Column already exists', { httpStatusCode: 409 }),
			);
			const { onRenameColumn } = setup();

			await onRenameColumn('col-name', 'age');

			expect(showError).toHaveBeenCalledWith(
				new Error('Column already exists'),
				'dataTable.column.alreadyExistsError',
			);
		});

		it('should show the generic rename message when a response error has no status code', async () => {
			const error = new ResponseError('Unknown response error');
			store.renameDataTableColumn.mockRejectedValue(error);
			const { onRenameColumn } = setup();

			await onRenameColumn('col-name', 'title');

			expect(showError).toHaveBeenCalledWith(error, 'dataTable.renameColumn.error');
		});
	});

	describe('onAddColumn', () => {
		it('should append the column and add an empty value to each row', async () => {
			const newColumn: DataTableColumn = {
				id: 'col-notes',
				name: 'notes',
				type: 'string',
				index: 3,
			};
			store.addDataTableColumn.mockResolvedValue(newColumn);
			const { params, onAddColumn } = setup({ rows: ref([{ id: 1 }]) });

			const result = await onAddColumn({ name: 'notes', type: 'string' });

			expect(result).toEqual({ success: true, httpStatus: 200 });
			expect(store.addDataTableColumn).toHaveBeenCalledWith(DATA_TABLE_ID, PROJECT_ID, {
				name: 'notes',
				type: 'string',
			});
			expect(params.columns.value.at(-1)).toEqual(newColumn);
			expect(params.rows.value).toEqual([{ id: 1, notes: null }]);
			expect(track).toHaveBeenCalledWith('User added data table column', {
				column_id: 'col-notes',
				column_type: 'string',
				data_table_id: DATA_TABLE_ID,
			});
		});

		it.each([
			[
				'a response error with a status code',
				new ResponseError('Conflict error', { httpStatusCode: 409 }),
				409,
				'Conflict error',
			],
			[
				'a response error without a status code',
				new ResponseError('Unknown response error'),
				500,
				'Unknown response error',
			],
			['a regular error', new Error('Regular error message'), 500, 'Regular error message'],
			['an unknown error', 'string error', 500, 'generic.unknownError'],
		])('should return the error details for %s', async (_, error, httpStatus, errorMessage) => {
			store.addDataTableColumn.mockRejectedValue(error);
			const { params, onAddColumn } = setup();

			const result = await onAddColumn({ name: 'notes', type: 'string' });

			expect(result).toEqual({ success: false, httpStatus, errorMessage });
			expect(params.columns.value).toEqual(createColumns());
		});
	});

	describe('onColumnMove', () => {
		it('should move the column to the user column index after the id column', async () => {
			const { params, onColumnMove } = setup();

			await onColumnMove({ columnId: 'col-name', toIndex: 3 });

			expect(store.moveDataTableColumn).toHaveBeenCalledWith(
				DATA_TABLE_ID,
				PROJECT_ID,
				'col-name',
				2,
			);
			expect(columnOrder(params.columns.value)).toEqual(['col-age', 'col-active', 'col-name']);
		});

		it.each([
			['before the first user column', 'col-active', 0, 0, ['col-active', 'col-name', 'col-age']],
			['after the last user column', 'col-name', 10, 2, ['col-age', 'col-active', 'col-name']],
		])(
			'should clamp the target index when the column is dropped %s',
			async (_, columnId, toIndex, expectedIndex, expectedOrder) => {
				const { params, onColumnMove } = setup();

				await onColumnMove({ columnId, toIndex });

				expect(store.moveDataTableColumn).toHaveBeenCalledWith(
					DATA_TABLE_ID,
					PROJECT_ID,
					columnId,
					expectedIndex,
				);
				expect(columnOrder(params.columns.value)).toEqual(expectedOrder);
			},
		);

		it.each([
			['the column does not exist', 'missing', 1],
			['the column stays at the same position', 'col-age', 2],
		])('should not move the column when %s', async (_, columnId, toIndex) => {
			const { params, onColumnMove } = setup();

			await onColumnMove({ columnId, toIndex });

			expect(store.moveDataTableColumn).not.toHaveBeenCalled();
			expect(params.columns.value).toEqual(createColumns());
		});

		it('should restore the column order when the move fails', async () => {
			const error = new Error('Move failed');
			store.moveDataTableColumn.mockRejectedValue(error);
			const { params, onColumnMove } = setup();

			await onColumnMove({ columnId: 'col-name', toIndex: 3 });

			expect(showError).toHaveBeenCalledWith(error, 'dataTable.moveColumn.error');
			expect(params.columns.value).toEqual(createColumns());
		});
	});

	describe('onAddRowClick', () => {
		it('should add an empty row on the last page and focus it', async () => {
			const insertedRow = { id: 3, name: null, age: null, active: null };
			store.insertEmptyRow.mockResolvedValue(insertedRow);
			const { params, onAddRowClick, contentLoading } = setup();

			await onAddRowClick();

			expect(params.ensureItemOnPage).toHaveBeenCalledWith(3);
			expect(store.insertEmptyRow).toHaveBeenCalledWith(DATA_TABLE_ID, PROJECT_ID);
			expect(params.rows.value).toEqual([...createRows(), insertedRow]);
			expect(params.setTotalItems).toHaveBeenCalledWith(3);
			expect(params.focusRow).toHaveBeenCalledWith(3);
			expect(track).toHaveBeenCalledWith('User added row to data table', {
				data_table_id: DATA_TABLE_ID,
			});
			expectSaveToggled(params);
			expect(contentLoading.value).toBe(false);
		});

		it('should not focus the row when the inserted row has no numeric id', async () => {
			store.insertEmptyRow.mockResolvedValue({ id: 'unknown' });
			const { params, onAddRowClick } = setup();

			await onAddRowClick();

			expect(params.focusRow).not.toHaveBeenCalled();
		});

		it('should show an error and keep the rows when the row cannot be added', async () => {
			const error = new Error('Failed to add row');
			store.insertEmptyRow.mockRejectedValue(error);
			const { params, onAddRowClick, contentLoading } = setup();

			await onAddRowClick();

			expect(showError).toHaveBeenCalledWith(error, 'dataTable.addRow.error');
			expect(params.rows.value).toEqual(createRows());
			expect(params.setTotalItems).not.toHaveBeenCalled();
			expect(params.focusRow).not.toHaveBeenCalled();
			expectSaveToggled(params);
			expect(contentLoading.value).toBe(false);
		});
	});

	describe('onCellEdit', () => {
		it('should update the row and save the new value', async () => {
			store.updateRow.mockResolvedValue(true);
			const { params, onCellEdit } = setup();

			await onCellEdit({ rowKey: '1', field: 'name', oldValue: 'John', newValue: 'Jim' });

			expect(params.rows.value[0]).toEqual({ id: 1, name: 'Jim', age: 30, active: true });
			expect(params.rows.value[1]).toEqual(createRows()[1]);
			expect(store.updateRow).toHaveBeenCalledWith(DATA_TABLE_ID, PROJECT_ID, 1, { name: 'Jim' });
			expect(track).toHaveBeenCalledWith('User edited data table content', {
				data_table_id: DATA_TABLE_ID,
				column_id: 'col-name',
				column_type: 'text',
			});
			expect(showMessage).not.toHaveBeenCalled();
			expectSaveToggled(params);
		});

		it('should ignore values that a data table cannot store', async () => {
			const { params, onCellEdit } = setup();

			await onCellEdit({ rowKey: '1', field: 'name', oldValue: 'John', newValue: { a: 1 } });

			expect(store.updateRow).not.toHaveBeenCalled();
			expect(params.rows.value).toEqual(createRows());
		});

		it('should revert the cell to the old value when the save fails', async () => {
			const error = new Error('Update failed');
			store.updateRow.mockRejectedValue(error);
			const { params, onCellEdit } = setup();

			await onCellEdit({ rowKey: '1', field: 'name', oldValue: 'John', newValue: 'Jim' });

			expect(params.rows.value).toEqual(createRows());
			expect(showError).toHaveBeenCalledWith(error, 'dataTable.updateRow.error');
			expect(track).not.toHaveBeenCalled();
			expectSaveToggled(params);
		});

		it('should revert the cell to null when the old value is not a valid value', async () => {
			store.updateRow.mockRejectedValue(new Error('Update failed'));
			const { params, onCellEdit } = setup();

			await onCellEdit({ rowKey: '1', field: 'name', oldValue: undefined, newValue: 'Jim' });

			expect(params.rows.value[0].name).toBeNull();
		});

		it('should show a precision warning when the new number exceeds the safe integer range', async () => {
			store.updateRow.mockResolvedValue(true);
			const { onCellEdit } = setup();

			await onCellEdit({
				rowKey: '1',
				field: 'age',
				oldValue: 30,
				newValue: Number.MAX_SAFE_INTEGER + 2,
			});

			expect(showMessage).toHaveBeenCalledWith({
				title: 'dataTable.updateRow.numberPrecisionWarning.title',
				message: 'dataTable.updateRow.numberPrecisionWarning.message',
				type: 'warning',
			});
		});
	});

	describe('fetchDataTableRows', () => {
		it('should fetch rows with the current page, sort, filter and search', async () => {
			const fetchedRows = [{ id: 5, name: 'Max', age: 40, active: true }];
			store.fetchDataTableContent.mockResolvedValue({ data: fetchedRows, count: 10 });
			const { params, fetchDataTableRows, contentLoading } = setup({
				currentPage: ref(2),
				pageSize: ref(20),
				sortBy: ref('name:asc'),
				filterJSON: ref('{"status":"active"}'),
				searchQuery: ref('Max'),
			});

			expect(await fetchDataTableRows()).toBe(true);

			expect(store.fetchDataTableContent).toHaveBeenCalledWith(
				DATA_TABLE_ID,
				PROJECT_ID,
				2,
				20,
				'name:asc',
				'{"status":"active"}',
				'Max',
			);
			expect(params.rows.value).toEqual(fetchedRows);
			expect(params.setTotalItems).toHaveBeenCalledWith(10);
			expect(params.clearSelection).toHaveBeenCalled();
			expect(contentLoading.value).toBe(false);
		});

		it('should show an error and keep the rows when the fetch fails', async () => {
			const error = new Error('Fetch failed');
			store.fetchDataTableContent.mockRejectedValue(error);
			const { params, fetchDataTableRows, contentLoading } = setup();

			expect(await fetchDataTableRows()).toBe(false);

			expect(showError).toHaveBeenCalledWith(error, 'dataTable.fetchContent.error');
			expect(params.rows.value).toEqual(createRows());
			expect(params.clearSelection).not.toHaveBeenCalled();
			expect(contentLoading.value).toBe(false);
		});
	});

	describe('handleDeleteSelected', () => {
		it('should not ask for confirmation when no rows are selected', async () => {
			const { handleDeleteSelected } = setup();

			await handleDeleteSelected([]);

			expect(confirm).not.toHaveBeenCalled();
			expect(store.deleteRows).not.toHaveBeenCalled();
		});

		it('should keep the rows when the user cancels the confirmation', async () => {
			confirm.mockResolvedValue('cancel');
			const { handleDeleteSelected } = setup();

			await handleDeleteSelected(['1']);

			expect(confirm).toHaveBeenCalledWith(
				'dataTable.deleteRows.confirmation',
				'dataTable.deleteRows.title',
				{ confirmButtonText: 'generic.delete', cancelButtonText: 'generic.cancel' },
			);
			expect(store.deleteRows).not.toHaveBeenCalled();
		});

		it('should delete the selected rows and fetch the rows again', async () => {
			store.deleteRows.mockResolvedValue(true);
			store.fetchDataTableContent.mockResolvedValue({ data: [], count: 0 });
			const { params, handleDeleteSelected } = setup();

			await handleDeleteSelected(['1', '2']);

			expect(store.deleteRows).toHaveBeenCalledWith(DATA_TABLE_ID, PROJECT_ID, [1, 2]);
			expect(store.fetchDataTableContent).toHaveBeenCalled();
			expect(params.rows.value).toEqual([]);
			expect(track).toHaveBeenCalledWith('User deleted rows in data table', {
				data_table_id: DATA_TABLE_ID,
				deleted_row_count: 2,
			});
			expectSaveToggled(params);
		});

		it('should show an error when the rows cannot be deleted', async () => {
			const error = new Error('Delete failed');
			store.deleteRows.mockRejectedValue(error);
			const { params, handleDeleteSelected } = setup();

			await handleDeleteSelected(['1']);

			expect(showError).toHaveBeenCalledWith(error, 'dataTable.deleteRows.error');
			expect(store.fetchDataTableContent).not.toHaveBeenCalled();
			expect(track).not.toHaveBeenCalled();
			expectSaveToggled(params);
		});
	});
});
