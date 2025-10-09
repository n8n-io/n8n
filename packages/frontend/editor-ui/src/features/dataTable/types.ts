import type { BaseResource } from '@/Interface';
import type { DataTable } from '@/features/dataTable/dataTable.types';

/**
 * Data Table resource type definition
 * This extends the ModuleResources interface to add DataTable as a resource type
 */
export type DataTableResource = BaseResource &
	DataTable & {
		resourceType: 'dataTable';
	};

// Extend the ModuleResources interface to include DataTable
declare module '@/Interface' {
	interface ModuleResources {
		dataTable: DataTableResource;
	}
}

// Export to make this a module
export {};
