import type { AGGridCellType, DataStoreValue } from '@/features/dataStore/datastore.types';

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
