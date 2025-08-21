import { z } from 'zod';

import type { ListDataStoreQueryDto } from '../dto';

export const dataStoreNameSchema = z.string().trim().min(1).max(128);
export const dataStoreIdSchema = z.string().max(36);

export const DATA_STORE_COLUMN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/;

export const dataStoreColumnNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.regex(
		DATA_STORE_COLUMN_REGEX,
		'Only alphanumeric characters and non-leading dashes are allowed for column names',
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

export type DataStoreUserTableName = `data_store_user_${string}`;

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
