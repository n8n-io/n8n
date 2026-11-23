/**
 * Input schemas of the former one-action data table write tools. Stored calls
 * of those tools still carry these shapes, so the batch tool parses them here.
 */
import type { DataTableWriteToolAction } from '@n8n/api-types';
import { z } from 'zod';

import {
	columnSchema,
	columnTypeSchema,
	dataTableNameDescribe,
	filterDescribe,
	filterSchema,
	filterSchemaWithMinOne,
	projectIdDescribe,
} from './schemas';

const columnNameForCardDescribe =
	'Current column name for the approval card. Pass whenever known so users see a name instead of an ID.';

const createAction = z.object({
	action: z.literal('create').describe('Create a new data table with typed columns'),
	name: z.string().min(1).max(128).describe('Table name'),
	projectId: z.string().optional().describe(projectIdDescribe),
	columns: z.array(columnSchema).min(1).describe('Column definitions'),
});

const deleteAction = z.object({
	action: z.literal('delete').describe('Permanently delete a data table and all its rows'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
});

const addColumnAction = z.object({
	action: z.literal('add-column').describe('Add a new column to an existing data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	columnName: z.string().describe('Column name (alphanumeric + underscores)'),
	type: columnTypeSchema.describe('Column data type'),
});

const deleteColumnAction = z.object({
	action: z.literal('delete-column').describe('Remove a column from a data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	columnId: z.string().describe('ID of the column'),
	currentColumnName: z.string().optional().describe(columnNameForCardDescribe),
});

const renameColumnAction = z.object({
	action: z.literal('rename-column').describe('Rename a column in a data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	columnId: z.string().describe('ID of the column'),
	currentColumnName: z.string().optional().describe(columnNameForCardDescribe),
	newName: z.string().describe('New column name'),
});

const insertRowsAction = z.object({
	action: z.literal('insert-rows').describe('Insert rows into a data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	rows: z
		.array(z.record(z.unknown()))
		.min(1)
		.max(100)
		.describe('Array of row objects (column name → value)'),
});

const updateRowsAction = z.object({
	action: z.literal('update-rows').describe('Update rows matching a filter in a data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	filter: filterSchema.describe(filterDescribe),
	data: z.record(z.unknown()).describe('Column values to set on matching rows'),
});

const deleteRowsAction = z.object({
	action: z
		.literal('delete-rows')
		.describe(
			'Delete rows matching a filter from a data table. At least one filter condition is required.',
		),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	filter: filterSchemaWithMinOne.describe(filterDescribe),
});

export const WRITE_ACTION_SCHEMAS = {
	create: createAction,
	delete: deleteAction,
	'add-column': addColumnAction,
	'delete-column': deleteColumnAction,
	'rename-column': renameColumnAction,
	'insert-rows': insertRowsAction,
	'update-rows': updateRowsAction,
	'delete-rows': deleteRowsAction,
} as const satisfies Record<DataTableWriteToolAction, z.ZodDiscriminatedUnionOption<'action'>>;
