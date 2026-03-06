export interface SerializedDataTableColumn {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'date';
	index: number;
}

export interface SerializedDataTable {
	id: string;
	name: string;
	columns: SerializedDataTableColumn[];
}
