import { z } from 'zod';

export const dataStoreNameSchema = z.string().trim().min(1).max(128);
export const dataStoreIdSchema = z.string().max(36);

export const dataStoreColumnNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.regex(
		/^[a-z0-9-]+$/,
		'Only lowercase alphanumeric characters and dashes are allowed for column names',
	);
export const dataStoreColumnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export const dataStoreCreateColumnSchema = z.object({
	name: dataStoreColumnNameSchema,
	type: dataStoreColumnTypeSchema,
});

export const dataStoreColumnSchema = dataStoreCreateColumnSchema.extend({
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
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
