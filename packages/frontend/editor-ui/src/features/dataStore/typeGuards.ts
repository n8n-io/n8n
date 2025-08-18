import type { DataStoreValue } from '@/features/dataStore/datastore.types';

export const isDataStoreValue = (value: unknown): value is DataStoreValue => {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		value instanceof Date
	);
};
