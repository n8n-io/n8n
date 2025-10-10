import type { Project } from '@/features/projects/projects.types';

export type DataTable = {
	id: string;
	name: string;
	sizeBytes: number;
	columns: DataTableColumn[];
	createdAt: string;
	updatedAt: string;
	projectId: string;
	project?: Project;
};

// Single sources of truth for supported types
export const DATA_TABLE_COLUMN_TYPES = ['string', 'number', 'boolean', 'date'] as const;
export type DataTableColumnType = (typeof DATA_TABLE_COLUMN_TYPES)[number];

export const AG_GRID_CELL_TYPES = [
	'text',
	'number',
	'boolean',
	'date',
	'dateString',
	'object',
] as const;
export type AGGridCellType = (typeof AG_GRID_CELL_TYPES)[number];

export type DataTableColumn = {
	id: string;
	name: string;
	type: DataTableColumnType;
	index: number;
};

export type DataTableColumnCreatePayload = Pick<DataTableColumn, 'name' | 'type'>;

export type DataTableValue = string | number | boolean | Date | null;

export type DataTableRow = Record<string, DataTableValue>;

export type AddColumnResponse = {
	success: boolean;
	httpStatus?: number;
	errorMessage?: string;
};
