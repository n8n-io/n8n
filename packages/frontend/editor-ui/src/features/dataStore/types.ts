import type { BaseResource } from '@/Interface';
import type {
	AGGridCellType,
	DataStore,
	DataStoreColumnType,
} from '@/features/dataStore/datastore.types';

/**
 * Data Store resource type definition
 * This extends the ModuleResources interface to add DataStore as a resource type
 */
export type DataStoreResource = BaseResource &
	DataStore & {
		resourceType: 'datastore';
	};

// Extend the ModuleResources interface to include DataStore
declare module '@/Interface' {
	interface ModuleResources {
		dataStore: DataStoreResource;
	}
}

export const isAGGridCellType = (value: unknown): value is AGGridCellType => {
	return (
		typeof value === 'string' &&
		['text', 'number', 'boolean', 'date', 'dateString', 'object'].includes(value)
	);
};

export const isDataStoreColumnType = (value: unknown): value is DataStoreColumnType => {
	return typeof value === 'string' && ['string', 'number', 'boolean', 'date'].includes(value);
};

// Export to make this a module
export {};
