import type { INodeProperties } from 'n8n-workflow';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import { parse } from './parse';

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

const moduleSchema = z.object({
	overrides: overridesSchema,
	defaultResource: z.string().optional(),
});

export type OverridesEntry = z.infer<typeof entrySchema>;

export type Overrides = z.infer<typeof overridesSchema>;

export async function loadOverrides(file: string): Promise<z.infer<typeof moduleSchema>> {
	const loaded: unknown = await import(pathToFileURL(file).href);
	return parse({ schema: moduleSchema, value: loaded, subject: `the overrides in ${file}` });
}
