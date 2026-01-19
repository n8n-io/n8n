import type {
	PersonalResourceOwner,
	StatusResourceOwner,
	TeamResourceOwner,
} from './resource-owner';

export interface ExportableDataTableColumn {
	id: string;
	name: string;
	type: string;
	index: number;
}

/**
 * Data table ownership in git files.
 * Only includes PersonalResourceOwner and TeamResourceOwner (no legacy string format).
 */
export type DataTableResourceOwner = PersonalResourceOwner | TeamResourceOwner;

export interface ExportableDataTable {
	id: string;
	name: string;
	columns: ExportableDataTableColumn[];
	createdAt: string;
	updatedAt: string;

	/**
	 * Owner of this data table at the source instance.
	 * Ownership is mirrored at target instance based on project sync.
	 * Data tables are new so they don't have legacy string format.
	 */
	ownedBy: DataTableResourceOwner | null;
}

export type StatusExportableDataTable = Omit<ExportableDataTable, 'ownedBy'> & {
	filename: string;
	ownedBy: StatusResourceOwner | null;
};
