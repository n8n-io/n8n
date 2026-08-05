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

/**
 * Who the serialized schema is for. The two audiences want opposite answers on
 * unknown keys and JSON Schema can only express one of them per document, so
 * the caller has to say which — there is no safe default.
 *
 * - `model` — a provider tool definition. Strict function calling rejects open
 *   objects, so every object is closed with `additionalProperties: false`.
 * - `validation` — a contract to check data against. Each object keeps its own
 *   unknown-key policy, so a plain `z.object()` stays open and `.strict()` stays
 *   closed. Zod *strips* unknown keys rather than rejecting them and JSON Schema
 *   cannot express "strip"; of the two available approximations, accepting is
 *   the one that matches what the Zod original would have done.
 */
export type SchemaAudience = 'model' | 'validation';

function serialize(schema: unknown, audience: SchemaAudience): JSONSchema7 | null {
	if (!schema) return null;
	if (isZodSchema(schema)) {
		// Despite the name, `strict` is the strategy that honours each object's own
		// unknown-key policy; the library default overrides it to closed.
		return zodToJsonSchemaImpl(
			schema,
			audience === 'model' ? {} : { removeAdditionalStrategy: 'strict' },
		) as JSONSchema7;
	}
	if (typeof schema === 'object') return schema as JSONSchema7;
	return null;
}

/**
 * Serialize a Zod schema into a provider tool definition, closing every object
 * to unknown keys. Raw JSON Schema passes through untouched.
 *
 * Throws if the schema cannot be serialized — see {@link toJsonSchemaOrNull} for
 * the forgiving variant.
 */
export function toModelJsonSchema(schema?: unknown): JSONSchema7 | null {
	return serialize(schema, 'model');
}

/**
 * Serialize a Zod schema into a document to validate data against, leaving each
 * object's own unknown-key policy intact. Raw JSON Schema passes through
 * untouched.
 *
 * The result is a contract check, not a filter: unlike Zod, `parseWithSchema`
 * returns JSON Schema-branch data unchanged, so any unknown key it accepts also
 * reaches the handler.
 *
 * Throws if the schema cannot be serialized — see {@link toJsonSchemaOrNull} for
 * the forgiving variant.
 */
export function toValidationJsonSchema(schema?: unknown): JSONSchema7 | null {
	return serialize(schema, 'validation');
}

/**
 * As above, but returns `null` instead of throwing when serialization fails.
 * Prefer the throwing variants where a caller can report the failure — a `null`
 * here is indistinguishable from "no schema was supplied".
 */
export function toJsonSchemaOrNull(schema: unknown, audience: SchemaAudience): JSONSchema7 | null {
	try {
		return serialize(schema, audience);
	} catch {
		return null;
	}
}

/**
 * @deprecated Ambiguous about its audience. Use {@link toModelJsonSchema} or
 * {@link toValidationJsonSchema}, which name the thing that actually differs.
 */
export function zodToJsonSchema(schema?: unknown): JSONSchema7 | null {
	return toJsonSchemaOrNull(schema, 'model');
}
