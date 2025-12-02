import type { Project } from '@/features/collaboration/projects/projects.types';

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
export const DATA_TABLE_COLUMN_TYPES = ['string', 'number', 'boolean', 'date', 'file'] as const;
export type DataTableColumnType = (typeof DATA_TABLE_COLUMN_TYPES)[number];

export const AG_GRID_CELL_TYPES = [
	'text',
	'number',
	'boolean',
	'date',
	'dateString',
	'object',
	'file',
] as const;
export type AGGridCellType = (typeof AG_GRID_CELL_TYPES)[number];

export type FileMetadata = {
	url: string;
	fileName: string;
	mimeType: string;
	size: number;
	bucketId: string;
	fileId: string;
	uploadedAt: Date;
};

export type DataTableColumn = {
	id: string;
	name: string;
	type: DataTableColumnType;
	index: number;
};

export type DataTableColumnCreatePayload = Pick<DataTableColumn, 'name' | 'type'>;

export type DataTableValue = string | number | boolean | Date | FileMetadata | null;

export type DataTableRow = Record<string, DataTableValue>;

export type AddColumnResponse = {
	success: boolean;
	httpStatus?: number;
	errorMessage?: string;
};
