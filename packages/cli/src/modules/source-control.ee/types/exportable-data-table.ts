export interface ExportableDataTableColumn {
	id: string;
	name: string;
	type: string;
	index: number;
}

export interface ExportableDataTable {
	id: string;
	name: string;
	projectId: string;
	columns: ExportableDataTableColumn[];
	createdAt: string;
	updatedAt: string;
}
