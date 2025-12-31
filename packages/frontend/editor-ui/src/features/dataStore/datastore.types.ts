import type { Project } from '@/types/projects.types';

export type DataStore = {
	id: string;
	name: string;
	sizeBytes: number;
	recordCount: number;
	columns: DataStoreColumn[];
	createdAt: string;
	updatedAt: string;
	projectId: string;
	project?: Project;
};

export type DataStoreColumnType = 'string' | 'number' | 'boolean' | 'date';

export type AGGridCellType = 'text' | 'number' | 'boolean' | 'date' | 'dateString' | 'object';

export type DataStoreColumn = {
	id: string;
	name: string;
	type: DataStoreColumnType;
	index: number;
};

export type DataStoreColumnCreatePayload = Pick<DataStoreColumn, 'name' | 'type'>;

export type DataStoreValue = string | number | boolean | Date | null;

export type DataStoreRow = Record<string, DataStoreValue>;
