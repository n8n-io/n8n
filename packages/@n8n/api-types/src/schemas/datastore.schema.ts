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
