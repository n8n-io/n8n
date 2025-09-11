import type {
	AGGridCellType,
	DataStoreValue,
	DataStoreColumnType,
} from '@/features/dataStore/datastore.types';

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
	return (
		typeof value === 'string' &&
		['text', 'number', 'boolean', 'date', 'dateString', 'object'].includes(value)
	);
};

export const isDataStoreColumnType = (type: unknown): type is DataStoreColumnType => {
	return type === 'string' || type === 'number' || type === 'boolean' || type === 'date';
};
