import type {
	DataTableValue,
	DataTableColumnType,
} from '@/features/core/dataTable/dataTable.types';
import { DATA_TABLE_COLUMN_TYPES } from '@/features/core/dataTable/dataTable.types';

export const isDataTableValue = (value: unknown): value is DataTableValue => {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		value instanceof Date
	);
};

export const isDataTableColumnType = (type: unknown): type is DataTableColumnType => {
	return typeof type === 'string' && (DATA_TABLE_COLUMN_TYPES as readonly string[]).includes(type);
};
