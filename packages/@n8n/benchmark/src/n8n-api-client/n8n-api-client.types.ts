/**
 * n8n workflow. This is a simplified version of the actual workflow object.
 */
export type Workflow = {
	id: string;
	name: string;
	tags?: string[];
};

export type Credential = {
	id: string;
	name: string;
	type: string;
};

export type DataTableColumn = {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'date';
};

export type DataTable = {
	id?: string;
	projectId?: number;
	name: string;
	columns: DataTableColumn[];
};
