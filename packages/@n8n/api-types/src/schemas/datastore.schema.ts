import { z } from 'zod';

export const datastoreNameSchema = z.string().trim().min(1).max(128);
export const datastoreIdSchema = z.string().max(36);

export const datastoreFieldNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.regex(
		/^[a-z0-9-]+$/,
		'Only lowercase alphanumeric characters and dashes are allowed for field names',
	);
export const datastoreFieldTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export const datastoreFieldSchema = z.object({
	name: datastoreFieldNameSchema,
	type: datastoreFieldTypeSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const datastoreSchema = z.object({
	id: datastoreIdSchema,
	name: datastoreNameSchema,
	fields: z.array(datastoreFieldSchema),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type Datastore = z.infer<typeof datastoreSchema>;
export type DatastoreField = z.infer<typeof datastoreFieldSchema>;
