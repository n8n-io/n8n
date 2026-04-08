import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';
import { zodToJsonSchema as zodToJsonSchemaImpl } from 'zod-to-json-schema';

/** Type guard: returns true when a tool input schema is a Zod schema (as opposed to raw JSON Schema). */
export function isZodSchema(schema: ZodType | JSONSchema7): schema is ZodType {
	return (
		typeof schema === 'object' &&
		schema !== null &&
		typeof (schema as ZodType).safeParse === 'function'
	);
}

export function zodToJsonSchema(schema?: unknown): JSONSchema7 | null {
	if (!schema) return null;
	try {
		if (isZodSchema(schema)) {
			if ('toJSONSchema' in schema && typeof schema.toJSONSchema === 'function') {
				return (schema as unknown as { toJSONSchema: () => JSONSchema7 }).toJSONSchema();
			}
			return zodToJsonSchemaImpl(schema) as Record<string, unknown>;
		}
		if (typeof schema === 'object' && schema !== null) {
			return schema;
		}
		return null;
	} catch {
		return null;
	}
}
