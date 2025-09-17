import type { Project } from '@/types/projects.types';

export type DataStore = {
	id: string;
	name: string;
	sizeBytes: number;
	columns: DataStoreColumn[];
	createdAt: string;
	updatedAt: string;
	projectId: string;
	project?: Project;
};

// Single sources of truth for supported types
export const DATA_STORE_COLUMN_TYPES = ['string', 'number', 'boolean', 'date'] as const;
export type DataStoreColumnType = (typeof DATA_STORE_COLUMN_TYPES)[number];

export const AG_GRID_CELL_TYPES = [
	'text',
	'number',
	'boolean',
	'date',
	'dateString',
	'object',
] as const;
export type AGGridCellType = (typeof AG_GRID_CELL_TYPES)[number];

export type DataStoreColumn = {
	id: string;
	name: string;
	type: DataStoreColumnType;
	index: number;
};

export type DataStoreColumnCreatePayload = Pick<DataStoreColumn, 'name' | 'type'>;

export type DataStoreValue = string | number | boolean | Date | null;

export type DataStoreRow = Record<string, DataStoreValue>;

export type AddColumnResponse = {
	success: boolean;
	httpStatus?: number;
	errorMessage?: string;
};
