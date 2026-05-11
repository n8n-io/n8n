import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { EditableCallbackParams, ICellRendererParams } from 'ag-grid-community';
import { useDataTableColumns } from './useDataTableColumns';
import type { DataTableColumn } from '@/features/core/dataTable/dataTable.types';
import { ADD_ROW_ROW_ID } from '@/features/core/dataTable/constants';

vi.mock('@/features/core/dataTable/composables/useDataTableTypes', () => ({
	useDataTableTypes: () => ({
		mapToAGCellType: (type: string) => (type === 'string' ? 'text' : type),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@/features/core/dataTable/components/dataGrid/ColumnHeader.vue', () => ({
	default: {},
}));

vi.mock('@/features/core/dataTable/components/dataGrid/ElDatePickerCellEditor.vue', () => ({
	default: {},
}));

vi.mock('@/features/core/dataTable/components/dataGrid/ElDatePickerFilter.vue', () => ({
	default: {},
}));

vi.mock('@/features/core/dataTable/components/dataGrid/AddColumnButton.vue', () => ({
	default: {},
}));

vi.mock('@/features/core/dataTable/components/dataGrid/AddRowButton.vue', () => ({
	default: {},
}));

vi.mock('@/features/core/dataTable/utils/columnUtils', () => ({
	createCellClass: vi.fn(),
	createValueGetter: vi.fn(),
	createCellRendererSelector: vi.fn(),
	createStringValueSetter: vi.fn(),
	stringCellEditorParams: {},
	dateValueFormatter: vi.fn(),
	numberValueFormatter: vi.fn(),
	getStringColumnFilterOptions: vi.fn(() => []),
	getDateColumnFilterOptions: vi.fn(() => []),
	getNumberColumnFilterOptions: vi.fn(() => []),
	getBooleanColumnFilterOptions: vi.fn(() => []),
	isOversizedValue: vi.fn(() => false),
}));

describe('useDataTableColumns', () => {
	const mockOnDeleteColumn = vi.fn();
	const mockOnRenameColumn = vi.fn();
	const mockOnAddRowClick = vi.fn();
	const mockOnAddColumn = vi.fn();
	const isTextEditorOpen = ref(false);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createComposable = () => {
		return useDataTableColumns({
			onDeleteColumn: mockOnDeleteColumn,
			onRenameColumn: mockOnRenameColumn,
			onAddRowClick: mockOnAddRowClick,
			onAddColumn: mockOnAddColumn,
			isTextEditorOpen,
		});
	};

	describe('createColumnDef', () => {
		it('should create basic column definition', () => {
			const { createColumnDef } = createComposable();
			const column: DataTableColumn = {
				id: 'col1',
				name: 'Column 1',
				type: 'string',
				index: 0,
			};

			const colDef = createColumnDef(column);

			expect(colDef.colId).toBe('col1');
			expect(colDef.field).toBe('Column 1');
			expect(colDef.headerName).toBe('Column 1');
			expect(colDef.sortable).toBe(true);
			expect(colDef.resizable).toBe(true);
		});

		it('should create string column with text editor', () => {
			const { createColumnDef } = createComposable();
			const column: DataTableColumn = {
				id: 'col1',
				name: 'Text Column',
				type: 'string',
				index: 0,
			};

			const colDef = createColumnDef(column);

			expect(colDef.cellEditor).toBe('agLargeTextCellEditor');
			expect(colDef.cellEditorPopup).toBe(true);
			expect(colDef.cellEditorPopupPosition).toBe('over');
		});

		it('should create date column with custom editor', () => {
			const { createColumnDef } = createComposable();
			const column: DataTableColumn = {
				id: 'col1',
				name: 'Date Column',
				type: 'date',
				index: 0,
			};

			const colDef = createColumnDef(column);

			expect(colDef.cellEditorPopup).toBe(true);
			expect(colDef.cellEditorSelector).toBeDefined();
		});

		it('should create number column with formatter', () => {
			const { createColumnDef } = createComposable();
			const column: DataTableColumn = {
				id: 'col1',
				name: 'Number Column',
				type: 'number',
				index: 0,
			};

			const colDef = createColumnDef(column);

			expect(colDef.valueFormatter).toBeDefined();
		});

		it('should create boolean column', () => {
			const { createColumnDef } = createComposable();
			const column: DataTableColumn = {
				id: 'col1',
				name: 'Boolean Column',
				type: 'boolean',
				index: 0,
			};

			const colDef = createColumnDef(column);

			expect(colDef.colId).toBe('col1');
			expect(colDef.field).toBe('Boolean Column');
		});

		it('should merge extra props', () => {
			const { createColumnDef } = createComposable();
			const column: DataTableColumn = {
				id: 'col1',
				name: 'Column 1',
				type: 'string',
				index: 0,
			};

			const colDef = createColumnDef(column, { editable: false, width: 100 });

			expect(colDef.editable).toBe(false);
			expect(colDef.width).toBe(100);
		});
	});

	describe('loadColumns', () => {
		it('should load columns and create column definitions', () => {
			const { loadColumns, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
				{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
			];

			loadColumns(columns);

			expect(colDefs.value.length).toBeGreaterThan(2);
			const userColumns = colDefs.value.filter(
				(col) =>
					col.colId !== 'id' &&
					col.colId !== 'createdAt' &&
					col.colId !== 'updatedAt' &&
					col.colId !== 'add-column',
			);
			expect(userColumns).toHaveLength(2);
		});

		it('should include ID column as first column', () => {
			const { loadColumns, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);

			expect(colDefs.value[0]?.colId).toBe('id');
		});

		it('should include system columns (createdAt, updatedAt)', () => {
			const { loadColumns, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);

			const systemColumns = colDefs.value.filter(
				(col) => col.colId === 'createdAt' || col.colId === 'updatedAt',
			);
			expect(systemColumns).toHaveLength(2);
		});

		it('should include add-column button as last column', () => {
			const { loadColumns, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);

			expect(colDefs.value[colDefs.value.length - 1]?.colId).toBe('add-column');
		});

		it('should order columns by index', () => {
			const { loadColumns, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col2', name: 'Column 2', type: 'string', index: 2 },
				{ id: 'col1', name: 'Column 1', type: 'string', index: 1 },
				{ id: 'col3', name: 'Column 3', type: 'string', index: 3 },
			];

			loadColumns(columns);

			const userColumns = colDefs.value.filter(
				(col) =>
					col.colId !== 'id' &&
					col.colId !== 'createdAt' &&
					col.colId !== 'updatedAt' &&
					col.colId !== 'add-column',
			);
			expect(userColumns[0]?.colId).toBe('col1');
			expect(userColumns[1]?.colId).toBe('col2');
			expect(userColumns[2]?.colId).toBe('col3');
		});
	});

	describe('deleteColumn', () => {
		it('should remove column by id', () => {
			const { loadColumns, deleteColumn, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
				{ id: 'col2', name: 'Column 2', type: 'string', index: 1 },
			];

			loadColumns(columns);
			const initialLength = colDefs.value.length;

			deleteColumn('col1');

			expect(colDefs.value.length).toBe(initialLength - 1);
			expect(colDefs.value.find((col) => col.colId === 'col1')).toBeUndefined();
		});

		it('should not affect other columns', () => {
			const { loadColumns, deleteColumn, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
				{ id: 'col2', name: 'Column 2', type: 'string', index: 1 },
			];

			loadColumns(columns);
			deleteColumn('col1');

			expect(colDefs.value.find((col) => col.colId === 'col2')).toBeDefined();
		});
	});

	describe('insertColumnAtIndex', () => {
		it('should insert column at specified index', () => {
			const { loadColumns, insertColumnAtIndex, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);
			const newColDef = { colId: 'new-col', field: 'New Column' };
			insertColumnAtIndex(newColDef, 0);

			expect(colDefs.value[0]).toEqual(newColDef);
		});
	});

	describe('addColumn', () => {
		it('should add column before the last column', () => {
			const { loadColumns, addColumn, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);
			const newColumn: DataTableColumn = {
				id: 'col2',
				name: 'Column 2',
				type: 'number',
				index: 1,
			};
			addColumn(newColumn);

			expect(colDefs.value[colDefs.value.length - 1]?.colId).toBe('add-column');
			expect(colDefs.value[colDefs.value.length - 2]?.colId).toBe('col2');
		});
	});

	describe('moveColumn', () => {
		it('should reorder columns correctly', () => {
			const { loadColumns, moveColumn, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
				{ id: 'col2', name: 'Column 2', type: 'string', index: 1 },
				{ id: 'col3', name: 'Column 3', type: 'string', index: 2 },
			];

			loadColumns(columns);
			moveColumn(1, 2);

			const userColumns = colDefs.value.filter(
				(col) =>
					col.colId !== 'id' &&
					col.colId !== 'createdAt' &&
					col.colId !== 'updatedAt' &&
					col.colId !== 'add-column',
			);

			expect(userColumns[0]?.colId).toBe('col2');
			expect(userColumns[1]?.colId).toBe('col3');
			expect(userColumns[2]?.colId).toBe('col1');
		});

		it('should preserve ID column at first position', () => {
			const { loadColumns, moveColumn, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
				{ id: 'col2', name: 'Column 2', type: 'string', index: 1 },
			];

			loadColumns(columns);
			moveColumn(1, 2);

			expect(colDefs.value[0]?.colId).toBe('id');
		});

		it('should preserve add-column button at last position', () => {
			const { loadColumns, moveColumn, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
				{ id: 'col2', name: 'Column 2', type: 'string', index: 1 },
			];

			loadColumns(columns);
			moveColumn(1, 2);

			expect(colDefs.value[colDefs.value.length - 1]?.colId).toBe('add-column');
		});

		it('should handle invalid index gracefully', () => {
			const { loadColumns, moveColumn, colDefs } = createComposable();
			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);
			const initialColDefs = [...colDefs.value];

			moveColumn(999, 1);

			expect(colDefs.value).toEqual(initialColDefs);
		});
	});

	describe('readOnly mode', () => {
		it('should disable editing on cells when readOnly is true', () => {
			const readOnly = ref(true);
			const { createColumnDef } = useDataTableColumns({
				onDeleteColumn: mockOnDeleteColumn,
				onRenameColumn: mockOnRenameColumn,
				onAddRowClick: mockOnAddRowClick,
				onAddColumn: mockOnAddColumn,
				isTextEditorOpen,
				readOnly,
			});

			const column: DataTableColumn = {
				id: 'col1',
				name: 'Column 1',
				type: 'string',
				index: 0,
			};

			const colDef = createColumnDef(column);

			// Test the editable function with normal row data
			const normalParams = { data: { id: 'row1' } };
			expect(typeof colDef.editable).toBe('function');
			if (typeof colDef.editable === 'function') {
				expect(colDef.editable(normalParams as EditableCallbackParams)).toBe(false);
			}
		});

		it('should enable editing on cells when readOnly is false', () => {
			const readOnly = ref(false);
			const { createColumnDef } = useDataTableColumns({
				onDeleteColumn: mockOnDeleteColumn,
				onRenameColumn: mockOnRenameColumn,
				onAddRowClick: mockOnAddRowClick,
				onAddColumn: mockOnAddColumn,
				isTextEditorOpen,
				readOnly,
			});

			const column: DataTableColumn = {
				id: 'col1',
				name: 'Column 1',
				type: 'string',
				index: 0,
			};

			const colDef = createColumnDef(column);

			// Test the editable function with normal row data
			const normalParams = { data: { id: 'row1' } };
			expect(typeof colDef.editable).toBe('function');
			if (typeof colDef.editable === 'function') {
				expect(colDef.editable(normalParams as EditableCallbackParams)).toBe(true);
			}
		});

		it('should disable column menu actions when readOnly is true', () => {
			const readOnly = ref(true);
			const { createColumnDef } = useDataTableColumns({
				onDeleteColumn: mockOnDeleteColumn,
				onRenameColumn: mockOnRenameColumn,
				onAddRowClick: mockOnAddRowClick,
				onAddColumn: mockOnAddColumn,
				isTextEditorOpen,
				readOnly,
			});

			const column: DataTableColumn = {
				id: 'col1',
				name: 'Column 1',
				type: 'string',
				index: 0,
			};

			const colDef = createColumnDef(column);

			expect(colDef.headerComponentParams).toMatchObject({
				allowMenuActions: false,
			});
		});

		it('should enable column menu actions when readOnly is false', () => {
			const readOnly = ref(false);
			const { createColumnDef } = useDataTableColumns({
				onDeleteColumn: mockOnDeleteColumn,
				onRenameColumn: mockOnRenameColumn,
				onAddRowClick: mockOnAddRowClick,
				onAddColumn: mockOnAddColumn,
				isTextEditorOpen,
				readOnly,
			});

			const column: DataTableColumn = {
				id: 'col1',
				name: 'Column 1',
				type: 'string',
				index: 0,
			};

			const colDef = createColumnDef(column);

			expect(colDef.headerComponentParams).toMatchObject({
				allowMenuActions: true,
			});
		});

		it('should disable AddRow button when readOnly is true', () => {
			const readOnly = ref(true);
			const { loadColumns, colDefs } = useDataTableColumns({
				onDeleteColumn: mockOnDeleteColumn,
				onRenameColumn: mockOnRenameColumn,
				onAddRowClick: mockOnAddRowClick,
				onAddColumn: mockOnAddColumn,
				isTextEditorOpen,
				readOnly,
			});

			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);

			const idColumn = colDefs.value.find((col) => col.colId === 'id');
			expect(idColumn).toBeDefined();

			// Check cellRendererSelector for AddRowButton params
			// The cellRendererSelector should return the AddRowButton with disabled: true
			// when the row value is the ADD_ROW_ROW_ID constant
			if (idColumn?.cellRendererSelector) {
				const addRowParams = { value: ADD_ROW_ROW_ID } as ICellRendererParams;
				const result = idColumn.cellRendererSelector(addRowParams);
				expect(result).toBeDefined();
				if (result && 'params' in result) {
					expect(result.params).toMatchObject({
						disabled: true,
					});
				}
			}
		});

		it('should enable AddRow button when readOnly is false', () => {
			const readOnly = ref(false);
			const { loadColumns, colDefs } = useDataTableColumns({
				onDeleteColumn: mockOnDeleteColumn,
				onRenameColumn: mockOnRenameColumn,
				onAddRowClick: mockOnAddRowClick,
				onAddColumn: mockOnAddColumn,
				isTextEditorOpen,
				readOnly,
			});

			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);

			const idColumn = colDefs.value.find((col) => col.colId === 'id');
			expect(idColumn).toBeDefined();

			// Check cellRendererSelector for AddRowButton params
			// The cellRendererSelector should return the AddRowButton with disabled: false
			// when the row value is the ADD_ROW_ROW_ID constant
			if (idColumn?.cellRendererSelector) {
				const addRowParams = { value: ADD_ROW_ROW_ID } as ICellRendererParams;
				const result = idColumn.cellRendererSelector(addRowParams);
				expect(result).toBeDefined();
				if (result && 'params' in result) {
					expect(result.params).toMatchObject({
						disabled: false,
					});
				}
			}
		});

		it('should disable AddColumn button when readOnly is true', () => {
			const readOnly = ref(true);
			const { loadColumns, colDefs } = useDataTableColumns({
				onDeleteColumn: mockOnDeleteColumn,
				onRenameColumn: mockOnRenameColumn,
				onAddRowClick: mockOnAddRowClick,
				onAddColumn: mockOnAddColumn,
				isTextEditorOpen,
				readOnly,
			});

			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);

			const addColumnCol = colDefs.value.find((col) => col.colId === 'add-column');
			expect(addColumnCol).toBeDefined();
			expect(addColumnCol?.headerComponentParams).toMatchObject({
				disabled: true,
			});
		});

		it('should enable AddColumn button when readOnly is false', () => {
			const readOnly = ref(false);
			const { loadColumns, colDefs } = useDataTableColumns({
				onDeleteColumn: mockOnDeleteColumn,
				onRenameColumn: mockOnRenameColumn,
				onAddRowClick: mockOnAddRowClick,
				onAddColumn: mockOnAddColumn,
				isTextEditorOpen,
				readOnly,
			});

			const columns: DataTableColumn[] = [
				{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
			];

			loadColumns(columns);

			const addColumnCol = colDefs.value.find((col) => col.colId === 'add-column');
			expect(addColumnCol).toBeDefined();
			expect(addColumnCol?.headerComponentParams).toMatchObject({
				disabled: false,
			});
		});

		it('should work without readOnly parameter (defaults to false)', () => {
			const { createColumnDef } = createComposable();
			const column: DataTableColumn = {
				id: 'col1',
				name: 'Column 1',
				type: 'string',
				index: 0,
			};

			const colDef = createColumnDef(column);

			// Test the editable function with normal row data
			const normalParams = { data: { id: 'row1' } };
			expect(typeof colDef.editable).toBe('function');
			if (typeof colDef.editable === 'function') {
				expect(colDef.editable(normalParams as EditableCallbackParams)).toBe(true);
			}

			// Menu actions should be enabled by default
			expect(colDef.headerComponentParams).toMatchObject({
				allowMenuActions: true,
			});
		});
	});
});
