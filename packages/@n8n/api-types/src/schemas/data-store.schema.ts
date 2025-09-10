import { z } from 'zod';

import type { ListDataStoreQueryDto } from '../dto';

export const insertRowReturnType = z.union([z.literal('all'), z.literal('count'), z.literal('id')]);

export const dataStoreNameSchema = z.string().trim().min(1).max(128);
export const dataStoreIdSchema = z.string().max(36);

// Postgres does not allow leading numbers or -
export const DATA_STORE_COLUMN_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export const dataStoreColumnNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(63) // Postgres has a maximum of 63 characters
	.regex(
		DATA_STORE_COLUMN_REGEX,
		'Only alphabetical characters and non-leading numbers and underscores are allowed for column names',
	);
export const dataStoreColumnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export const dataStoreCreateColumnSchema = z.object({
	name: dataStoreColumnNameSchema,
	type: dataStoreColumnTypeSchema,
	index: z.number().optional(),
});
export type DataStoreCreateColumnSchema = z.infer<typeof dataStoreCreateColumnSchema>;

export const dataStoreColumnSchema = dataStoreCreateColumnSchema.extend({
	dataStoreId: dataStoreIdSchema,
});

export const dataStoreSchema = z.object({
	id: dataStoreIdSchema,
	name: dataStoreNameSchema,
	columns: z.array(dataStoreColumnSchema),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type DataStore = z.infer<typeof dataStoreSchema>;
export type DataStoreColumn = z.infer<typeof dataStoreColumnSchema>;

export type DataStoreListFilter = {
	id?: string | string[];
	projectId?: string | string[];
	name?: string;
};

export type DataStoreListOptions = Partial<ListDataStoreQueryDto> & {
	filter: { projectId: string };
};

export const dateTimeSchema = z
	.string()
	.datetime({ offset: true })
	.transform((s) => new Date(s))
	.pipe(z.date());

export const dataStoreColumnValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
	z.date(),
]);
