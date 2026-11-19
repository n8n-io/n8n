import type { DataTableWriteToolAction } from '@n8n/api-types';
import { z } from 'zod';

import {
	columnSchema,
	columnTypeSchema,
	filterDescribe,
	filterSchema,
	filterSchemaWithMinOne,
} from './schemas';

const tableRef = z
	.string()
	.min(1)
	.describe('Table ID or name. A table created earlier in the same batch can be named.');

// The model sees one flattened object for all actions, so fields that several
// actions share must carry one description.
const columnRef = z
	.string()
	.min(1)
	.describe(
		'Column name (alphanumeric + underscores). delete-column and rename-column also accept a column ID.',
	);

const CHANGE_SCHEMAS = {
	create: z.object({
		action: z.literal('create').describe('Create a new data table with typed columns'),
		name: z.string().min(1).max(128).describe('Table name'),
		columns: z.array(columnSchema).min(1).describe('Column definitions'),
	}),
	delete: z.object({
		action: z.literal('delete').describe('Permanently delete a data table and all its rows'),
		table: tableRef,
	}),
	'add-column': z.object({
		action: z.literal('add-column').describe('Add a new column to a data table'),
		table: tableRef,
		column: columnRef,
		type: columnTypeSchema.describe('Column data type'),
	}),
	'delete-column': z.object({
		action: z.literal('delete-column').describe('Remove a column from a data table'),
		table: tableRef,
		column: columnRef,
	}),
	'rename-column': z.object({
		action: z.literal('rename-column').describe('Rename a column in a data table'),
		table: tableRef,
		column: columnRef,
		newName: z.string().min(1).describe('New column name'),
	}),
	'insert-rows': z.object({
		action: z.literal('insert-rows').describe('Insert rows into a data table'),
		table: tableRef,
		rows: z
			.array(z.record(z.unknown()))
			.min(1)
			.max(100)
			.describe('Array of row objects (column name → value)'),
	}),
	'update-rows': z.object({
		action: z.literal('update-rows').describe('Update rows matching a filter in a data table'),
		table: tableRef,
		filter: filterSchema.describe(filterDescribe),
		data: z.record(z.unknown()).describe('Column values to set on matching rows'),
	}),
	'delete-rows': z.object({
		action: z
			.literal('delete-rows')
			.describe(
				'Delete rows matching a filter from a data table. At least one filter condition is required.',
			),
		table: tableRef,
		filter: filterSchemaWithMinOne.describe(filterDescribe),
	}),
} as const satisfies Record<DataTableWriteToolAction, z.ZodDiscriminatedUnionOption<'action'>>;

export const dataTableChangeSchema = z.discriminatedUnion('action', [
	CHANGE_SCHEMAS.create,
	CHANGE_SCHEMAS.delete,
	CHANGE_SCHEMAS['add-column'],
	CHANGE_SCHEMAS['delete-column'],
	CHANGE_SCHEMAS['rename-column'],
	CHANGE_SCHEMAS['insert-rows'],
	CHANGE_SCHEMAS['update-rows'],
	CHANGE_SCHEMAS['delete-rows'],
]);

export const changeDataTablesInputSchema = z.object({
	projectId: z
		.string()
		.optional()
		.describe(
			"Project ID. New tables go to this project (default: this conversation's project). It also picks the table when a name exists in several projects.",
		),
	changes: z
		.array(dataTableChangeSchema)
		.min(1)
		.max(50)
		.describe('Changes to apply in order. The user approves the whole list at once.'),
});

export type DataTableChange = z.infer<typeof dataTableChangeSchema>;
export type ChangeDataTablesInput = z.infer<typeof changeDataTablesInputSchema>;
