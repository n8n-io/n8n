import { z } from 'zod';

import type { ListDataTableQueryDto } from '../dto';

export const insertRowReturnType = z.union([z.literal('all'), z.literal('count'), z.literal('id')]);

export const dataTableNameSchema = z.string().trim().min(1).max(128);
export const dataTableIdSchema = z.string().max(36);

// Postgres does not allow leading numbers or -
export const DATA_TABLE_COLUMN_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;
export const DATA_TABLE_COLUMN_MAX_LENGTH = 63; // Postgres has a maximum of 63 characters
export const DATA_TABLE_COLUMN_ERROR_MESSAGE =
	'Only alphabetical characters and non-leading numbers and underscores are allowed for column names, and the maximum length is 63 characters.';

export const dataTableColumnNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(DATA_TABLE_COLUMN_MAX_LENGTH) // Postgres has a maximum of 63 characters
	.regex(DATA_TABLE_COLUMN_REGEX, DATA_TABLE_COLUMN_ERROR_MESSAGE);
export const dataTableColumnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export const dataTableCreateColumnSchema = z.object({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
	index: z.number().optional(),
});
export type DataTableCreateColumnSchema = z.infer<typeof dataTableCreateColumnSchema>;

export const dataTableColumnSchema = dataTableCreateColumnSchema.extend({
	dataTableId: dataTableIdSchema,
});

export const dataTableSchema = z.object({
	id: dataTableIdSchema,
	name: dataTableNameSchema,
	columns: z.array(dataTableColumnSchema),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type DataTable = z.infer<typeof dataTableSchema>;
export type DataTableColumn = z.infer<typeof dataTableColumnSchema>;

export type DataTableListFilter = {
	id?: string | string[];
	projectId?: string | string[];
	name?: string;
};

export type DataTableListOptions = Partial<ListDataTableQueryDto> & {
	filter: { projectId: string };
};

export const dateTimeSchema = z
	.string()
	.datetime({ offset: true })
	.transform((s) => new Date(s))
	.pipe(z.date());

export const dataTableColumnValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
	z.date(),
]);
