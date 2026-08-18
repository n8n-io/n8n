import type { ZodSchema } from 'zod';
import { zodToJsonSchema, type Options } from 'zod-to-json-schema';

import { toDraft202012 } from './draft-2020-12';

export { JSON_SCHEMA_DRAFT_2020_12, toDraft202012 } from './draft-2020-12';

/**
 * Converts a zod schema to a JSON Schema 2020-12 document.
 *
 * `zod-to-json-schema` only targets draft-07 (its `jsonSchema2019-09` target is
 * no closer — it regresses `exclusiveMinimum` to the draft-04 boolean form), so
 * the document is rewritten afterwards. Replace the whole function body with
 * `z.toJSONSchema(schema, { target: 'draft-2020-12' })` once these schemas move
 * to zod v4, which emits the dialect natively.
 */
export function zodToDraft202012(
	schema: ZodSchema,
	options?: Partial<Omit<Options<'jsonSchema7'>, 'target'>>,
): Record<string, unknown> {
	return toDraft202012(zodToJsonSchema(schema, { ...options, target: 'jsonSchema7' }));
}
