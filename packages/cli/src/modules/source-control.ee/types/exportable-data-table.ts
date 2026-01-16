import type { StatusResourceOwner } from './resource-owner';

export interface ExportableDataTableColumn {
	id: string;
	name: string;
	type: string;
	index: number;
}

export interface ExportableDataTable {
	id: string;
	name: string;
	columns: ExportableDataTableColumn[];
	createdAt: string;
	updatedAt: string;

	/**
	 * Owner of this data table at the source instance.
	 * Ownership is mirrored at target instance based on project sync.
	 */
	ownedBy: StatusResourceOwner | null;
}

export type StatusExportableDataTable = ExportableDataTable & {
	filename: string;
};
