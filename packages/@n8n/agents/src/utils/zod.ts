import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';
import { zodToJsonSchema as zodToJsonSchemaImpl } from 'zod-to-json-schema';

/** Type guard: returns true when a value is a Zod schema (as opposed to raw JSON Schema or any other shape). */
export function isZodSchema(schema: unknown): schema is ZodType {
	return (
		typeof schema === 'object' &&
		schema !== null &&
		typeof (schema as { safeParse?: unknown }).safeParse === 'function'
	);
}

export interface ZodToJsonSchemaOptions {
	/**
	 * Put `additionalProperties: false` on every object, as model providers require.
	 * Turn off when the result is used to *validate* data — Zod objects strip unknown
	 * keys rather than rejecting them, so closing them makes the serialized schema
	 * reject payloads the Zod original accepts. `.strict()` stays closed either way.
	 */
	closeObjects?: boolean;
}

export function zodToJsonSchema(
	schema?: unknown,
	{ closeObjects = true }: ZodToJsonSchemaOptions = {},
): JSONSchema7 | null {
	if (!schema) return null;
	try {
		if (isZodSchema(schema)) {
			if ('toJSONSchema' in schema && typeof schema.toJSONSchema === 'function') {
				return (schema as unknown as { toJSONSchema: () => JSONSchema7 }).toJSONSchema();
			}
			// Despite the name, `strict` is the strategy that honours each object's own
			// unknown-key policy; the library default overrides it to closed.
			return zodToJsonSchemaImpl(
				schema,
				closeObjects ? {} : { removeAdditionalStrategy: 'strict' },
			) as Record<string, unknown>;
		}
		if (typeof schema === 'object' && schema !== null) {
			return schema;
		}
		return null;
	} catch {
		return null;
	}
}
