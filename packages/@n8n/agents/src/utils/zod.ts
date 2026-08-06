import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';
import { toJSONSchema as toJsonSchemaV4, type core as zodV4Core } from 'zod/v4';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function isZodSchema(schema: unknown): schema is ZodType {
	return (
		typeof schema === 'object' &&
		schema !== null &&
		typeof (schema as { safeParse?: unknown }).safeParse === 'function'
	);
}

/** Whether to render what goes into a schema or what comes out of it. Defaults
 *  and transforms make those differ: `z.string().default('x')` is optional on
 *  the way in, always present on the way out. Zod 4 only. */
export type SchemaDirection = 'input' | 'output';

function isZodV4Schema(schema: ZodType): schema is ZodType & zodV4Core.$ZodType {
	return typeof (schema as Partial<zodV4Core.$ZodType>)._zod === 'object';
}

function serializeV3(schema: ZodType): JSONSchema7 {
	return zodToJsonSchema(schema) as JSONSchema7;
}

function serializeV4(schema: zodV4Core.$ZodType, io: SchemaDirection): JSONSchema7 {
	return toJsonSchemaV4(schema, {
		io,
		target: 'draft-7',
		unrepresentable: 'any',
		override: ({ jsonSchema }) => {
			if (jsonSchema.type === 'object' && jsonSchema.additionalProperties === undefined) {
				jsonSchema.additionalProperties = false;
			}
		},
	}) as JSONSchema7;
}

function isJsonSchemaObject(schema: unknown): schema is JSONSchema7 {
	return typeof schema === 'object' && schema !== null;
}

/** Serializes a schema for the model: strict function calling wants every object closed. */
export function toModelJsonSchema(
	schema?: unknown,
	io: SchemaDirection = 'input',
): JSONSchema7 | null {
	if (!schema) return null;
	if (isZodSchema(schema)) {
		return isZodV4Schema(schema) ? serializeV4(schema, io) : serializeV3(schema);
	}
	return isJsonSchemaObject(schema) ? schema : null;
}
