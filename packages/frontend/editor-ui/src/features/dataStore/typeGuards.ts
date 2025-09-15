import type {
	AGGridCellType,
	DataStoreValue,
	DataStoreColumnType,
} from '@/features/dataStore/datastore.types';
import { AG_GRID_CELL_TYPES, DATA_STORE_COLUMN_TYPES } from '@/features/dataStore/datastore.types';

export const isDataStoreValue = (value: unknown): value is DataStoreValue => {
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

export const isDataStoreColumnType = (type: unknown): type is DataStoreColumnType => {
	return typeof type === 'string' && (DATA_STORE_COLUMN_TYPES as readonly string[]).includes(type);
};
