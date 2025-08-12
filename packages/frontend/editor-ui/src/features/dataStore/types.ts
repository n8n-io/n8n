import type { BaseResource } from '@/Interface';
import type { DataStore } from '@/features/dataStore/datastore.types';

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

// Export to make this a module
export {};
