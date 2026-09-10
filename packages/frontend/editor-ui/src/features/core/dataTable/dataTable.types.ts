import type { Project } from '@/features/collaboration/projects/projects.types';
import type {
	DataTableEnumOption,
	DataTableEnumOptionInput,
	DataTableMetadata,
} from '@n8n/api-types';
import type { DataTableAutomationStatus, DataTableRowAutomation } from 'n8n-workflow';

export type { DataTableAutomationStatus, DataTableRowAutomation };

/** A published Data Table Trigger node that listens to this table. */
export type DataTableTrigger = {
	workflowId: string;
	workflowName: string | null;
	nodeId: string;
};

export type DataTable = {
	id: string;
	name: string;
	sizeBytes: number;
	columns: DataTableColumn[];
	metadata?: DataTableMetadata;
	triggers?: DataTableTrigger[];
	createdAt: string;
	updatedAt: string;
	projectId: string;
	project?: Project;
};

// Single sources of truth for supported types
export const DATA_TABLE_COLUMN_TYPES = ['string', 'number', 'boolean', 'date', 'enum'] as const;
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
	options?: DataTableEnumOption[] | null;
	defaultValue?: string | null;
};

export type DataTableColumnCreatePayload = Pick<DataTableColumn, 'name' | 'type'> & {
	csvColumnName?: string;
	options?: DataTableEnumOptionInput[];
	defaultValue?: string | null;
};

export type DataTableEnumValue = {
	id: string;
	value: string;
	color: string;
};

export type DataTableValue = string | number | boolean | Date | DataTableEnumValue | null;

export type DataTableRow = Record<string, DataTableValue>;

export type DataTableKanbanLane = {
	value: string | null;
	count: number;
	rows: DataTableRow[];
	nextCursor: string | null;
	hasMore: boolean;
};

export type DataTableKanbanBoard = {
	lanes: DataTableKanbanLane[];
	revision: string;
};

export type DataTableKanbanPage = Pick<DataTableKanbanLane, 'rows' | 'nextCursor' | 'hasMore'>;

export type DataTableKanbanMove = {
	groupByColumnId: string;
	targetValue: string | null;
	afterRowId: number | null;
};

export type AddColumnResponse = {
	success: boolean;
	httpStatus?: number;
	errorMessage?: string;
};
