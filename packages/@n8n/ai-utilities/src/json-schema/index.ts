import type { ZodSchema } from 'zod';
import { zodToJsonSchema, type Options } from 'zod-to-json-schema';

import { toDraft202012 } from './draft-2020-12';

export { JSON_SCHEMA_DRAFT_2020_12, toDraft202012 } from './draft-2020-12';

/**
 * Converts a zod schema to a JSON Schema 2020-12 document.
 *
 * Output matches `z.toJSONSchema(schema, { target: 'draft-2020-12' })` from Zod v4,
 * when we migrate to Zod v4, we can remove this and use the built-in toJSONSchema() instead.
 */
export function zodToDraft202012(
	schema: ZodSchema,
	options?: Partial<Omit<Options<'jsonSchema7'>, 'target'>>,
): Record<string, unknown> {
	return toDraft202012(zodToJsonSchema(schema, { ...options, target: 'jsonSchema7' }));
}
