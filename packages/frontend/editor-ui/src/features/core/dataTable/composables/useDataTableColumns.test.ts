import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import type { DataGridColumn } from '@n8n/design-system';
import {
	DELETE_COLUMN_ACTION,
	useDataTableColumns,
} from '@/features/core/dataTable/composables/useDataTableColumns';
import type { DataTableColumn, DataTableRow } from '@/features/core/dataTable/dataTable.types';
import {
	DATA_TABLE_ID_COLUMN_WIDTH,
	DEFAULT_COLUMN_WIDTH,
	MAX_CELL_DISPLAY_LENGTH,
} from '@/features/core/dataTable/constants';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const nameColumn: DataTableColumn = { id: 'col-name', name: 'name', type: 'string', index: 0 };
const ageColumn: DataTableColumn = { id: 'col-age', name: 'age', type: 'number', index: 1 };

const oversizedText = 'a'.repeat(MAX_CELL_DISPLAY_LENGTH + 1);

const createGridColumns = (columns: DataTableColumn[]) => useDataTableColumns(ref(columns)).value;

const findGridColumn = (gridColumns: Array<DataGridColumn<DataTableRow>>, id: string) => {
	const gridColumn = gridColumns.find((column) => column.id === id);
	if (!gridColumn) throw new Error(`Column ${id} not found`);
	return gridColumn;
};

const callRowRule = <T>(rule: T | ((row: DataTableRow) => T) | undefined, row: DataTableRow) =>
	typeof rule === 'function' ? (rule as (row: DataTableRow) => T)(row) : rule;

describe('useDataTableColumns', () => {
	it('should place the id column first, user columns next and system date columns last', () => {
		const gridColumns = createGridColumns([nameColumn, ageColumn]);

		expect(gridColumns.map((column) => column.id)).toEqual([
			'id',
			'col-name',
			'col-age',
			'createdAt',
			'updatedAt',
		]);
	});

	it('should order user columns by index', () => {
		const gridColumns = createGridColumns([
			{ ...ageColumn, index: 0 },
			{ ...nameColumn, index: 2 },
			{ id: 'col-active', name: 'active', type: 'boolean', index: 1 },
		]);

		expect(gridColumns.slice(1, 4).map((column) => column.id)).toEqual([
			'col-age',
			'col-active',
			'col-name',
		]);
	});

	it('should lock the id column to the left with a fixed width and no editing', () => {
		const idColumn = findGridColumn(createGridColumns([]), 'id');

		expect(idColumn).toMatchObject({
			field: 'id',
			label: 'id',
			type: 'string',
			width: DATA_TABLE_ID_COLUMN_WIDTH,
			minWidth: DATA_TABLE_ID_COLUMN_WIDTH,
			maxWidth: DATA_TABLE_ID_COLUMN_WIDTH,
			resizable: false,
			filterable: false,
			editable: false,
			lock: 'left',
		});
	});

	it('should lock the system date columns to the right and make them read-only', () => {
		const gridColumns = createGridColumns([]);

		for (const name of ['createdAt', 'updatedAt']) {
			expect(findGridColumn(gridColumns, name)).toMatchObject({
				field: name,
				label: name,
				type: 'date',
				icon: 'calendar',
				width: DEFAULT_COLUMN_WIDTH,
				editable: false,
				lock: 'right',
			});
		}
	});

	it('should map a user column to a renameable grid column with a delete action', () => {
		const gridColumn = findGridColumn(createGridColumns([ageColumn]), 'col-age');

		expect(gridColumn).toEqual({
			id: 'col-age',
			field: 'age',
			label: 'age',
			type: 'number',
			icon: 'hash',
			width: DEFAULT_COLUMN_WIDTH,
			renameable: true,
			actions: [
				{
					id: DELETE_COLUMN_ACTION,
					label: 'dataTable.deleteColumn.confirm.title',
					icon: 'trash-2',
				},
			],
		});
	});

	it('should keep string cells with regular values editable without the cell slot', () => {
		const gridColumn = findGridColumn(createGridColumns([nameColumn]), 'col-name');
		const row: DataTableRow = { id: 1, name: 'short' };

		expect(callRowRule(gridColumn.editable, row)).toBe(true);
		expect(callRowRule(gridColumn.cellSlot, row)).toBe(false);
		expect(callRowRule(gridColumn.cellClass, row)).toBeUndefined();
	});

	it('should make string cells with oversized values read-only and render them with the cell slot', () => {
		const gridColumn = findGridColumn(createGridColumns([nameColumn]), 'col-name');
		const row: DataTableRow = { id: 1, name: oversizedText };

		expect(callRowRule(gridColumn.editable, row)).toBe(false);
		expect(callRowRule(gridColumn.cellSlot, row)).toBe(true);
		expect(callRowRule(gridColumn.cellClass, row)).toBe('oversized-cell');
	});

	it('should not add oversized value rules to non-string columns', () => {
		const gridColumn = findGridColumn(createGridColumns([ageColumn]), 'col-age');

		expect(gridColumn.editable).toBeUndefined();
		expect(gridColumn.cellSlot).toBeUndefined();
		expect(gridColumn.cellClass).toBeUndefined();
	});

	it('should update the grid columns when the data table columns change', () => {
		const columns = ref<DataTableColumn[]>([nameColumn]);
		const gridColumns = useDataTableColumns(columns);

		columns.value = [nameColumn, ageColumn];

		expect(gridColumns.value.map((column) => column.id)).toContain('col-age');
	});
});
