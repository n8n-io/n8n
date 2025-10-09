import type {
	AGGridCellType,
	DataTableValue,
	DataTableColumnType,
} from '@/features/dataTable/dataTable.types';
import { AG_GRID_CELL_TYPES, DATA_TABLE_COLUMN_TYPES } from '@/features/dataTable/dataTable.types';

export const isDataTableValue = (value: unknown): value is DataTableValue => {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		value instanceof Date
	);
};

export const isAGGridCellType = (value: unknown): value is AGGridCellType => {
	return typeof value === 'string' && (AG_GRID_CELL_TYPES as readonly string[]).includes(value);
};

export const isDataTableColumnType = (type: unknown): type is DataTableColumnType => {
	return typeof type === 'string' && (DATA_TABLE_COLUMN_TYPES as readonly string[]).includes(type);
};
