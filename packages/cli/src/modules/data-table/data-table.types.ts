import type { FieldTypeMap } from 'n8n-workflow';

export type DataTableUserTableName = `${string}data_table_user_${string}`;

export const DATA_TABLE_KANBAN_ORDER_COLUMN = '_n8nKanbanOrder';
export const DATA_TABLE_KANBAN_ORDER_LENGTH = 32;

export const columnTypeToFieldType: Record<string, keyof FieldTypeMap> = {
	// eslint-disable-next-line id-denylist
	number: 'number',
	// eslint-disable-next-line id-denylist
	string: 'string',
	enum: 'string',
	// eslint-disable-next-line id-denylist
	boolean: 'boolean',
	date: 'dateTime',
};
