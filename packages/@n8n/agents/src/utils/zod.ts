import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

/** Type guard: returns true when a tool input schema is a Zod schema (as opposed to raw JSON Schema). */
export function isZodSchema(schema: ZodType | JSONSchema7): schema is ZodType {
	return typeof (schema as ZodType).safeParse === 'function';
}
