import type { INodeProperties } from 'n8n-workflow';
import { z } from 'zod';

const fieldsSchema = z.record(z.custom<Partial<INodeProperties>>());

const entrySchema = z
	.object({
		exclude: z.string().optional(),
		flatten: z.string().optional(),
		fields: fieldsSchema.optional(),
		default: z.literal(true).optional(),
	})
	.strict();

const overridesSchema = z
	.object({ '*': z.object({ fields: fieldsSchema }).strict().optional() })
	.catchall(entrySchema);

export const overridesModuleSchema = z.object({
	overrides: overridesSchema,
	defaultResource: z.string().optional(),
});

export type OverridesEntry = z.infer<typeof entrySchema>;

export type Overrides = z.infer<typeof overridesSchema>;
