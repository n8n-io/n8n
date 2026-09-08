import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';
import { zodToJsonSchema as zodToJsonSchemaLib } from 'zod-to-json-schema';

export function isZodSchema(schema: unknown): schema is ZodType {
	return (
		typeof schema === 'object' &&
		schema !== null &&
		typeof (schema as { safeParse?: unknown }).safeParse === 'function'
	);
}

export function zodSchemaToJsonSchema(schema: ZodType): JSONSchema7 {
	if ('toJSONSchema' in schema && typeof schema.toJSONSchema === 'function') {
		return (schema as unknown as { toJSONSchema: () => JSONSchema7 }).toJSONSchema();
	}
	return zodToJsonSchemaLib(schema) as JSONSchema7;
}

export function zodToJsonSchema(schema?: unknown): JSONSchema7 | null {
	if (!schema) return null;
	try {
		if (isZodSchema(schema)) return zodSchemaToJsonSchema(schema);
		if (typeof schema === 'object') return schema;
		return null;
	} catch {
		return null;
	}
}
