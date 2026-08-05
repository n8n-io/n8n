import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';
import { toJSONSchema as toJsonSchemaV4, type core as zodV4Core } from 'zod/v4';
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
 * Who the serialized schema is for. JSON Schema can only be open or closed to
 * unknown keys, and the two audiences want opposite answers, so there is no
 * safe default:
 *
 * - `model` — strict function calling rejects open objects.
 * - `validation` — Zod *strips* unknown keys rather than rejecting them, and
 *   accepting is the closer of the two approximations available.
 */
export type SchemaAudience = 'model' | 'validation';

/**
 * A property check rather than `instanceof z4.core.$ZodType`, so it survives
 * duplicate zod copies in the store (the MCP SDK pins its own) — where a false
 * negative would route a v4 schema to the v3 converter, which renders it as
 * `{}`. Not `_def`: `zod/v4/mini` has none.
 */
function isZodV4Schema(schema: ZodType): schema is ZodType & zodV4Core.$ZodType {
	return typeof (schema as Partial<zodV4Core.$ZodType>)._zod === 'object';
}

function serializeV3(schema: ZodType, audience: SchemaAudience): JSONSchema7 {
	// Despite the name, `strict` is the strategy that honours each object's own
	// unknown-key policy; the library default overrides it to closed.
	return zodToJsonSchemaImpl(
		schema,
		audience === 'model' ? {} : { removeAdditionalStrategy: 'strict' },
	) as JSONSchema7;
}

function serializeV4(schema: zodV4Core.$ZodType, audience: SchemaAudience): JSONSchema7 {
	return toJsonSchemaV4(schema, {
		// Tool arguments and resume payloads are both inputs. Input mode is also
		// what leaves a plain object's `additionalProperties` unset.
		io: 'input',
		// Match the v3 branch so consumers only ever see one dialect.
		target: 'draft-7',
		// Direction is not audience: an input can still need closing.
		...(audience === 'model'
			? {
					override: ({ jsonSchema }) => {
						if (jsonSchema.type === 'object' && jsonSchema.additionalProperties === undefined) {
							jsonSchema.additionalProperties = false;
						}
					},
				}
			: {}),
	}) as JSONSchema7;
}

/** Anything that is neither a Zod schema nor a primitive is taken at its word as
 *  raw JSON Schema — there is nothing further to check at runtime. */
function isJsonSchemaObject(schema: unknown): schema is JSONSchema7 {
	return typeof schema === 'object' && schema !== null;
}

function serialize(schema: unknown, audience: SchemaAudience): JSONSchema7 | null {
	if (!schema) return null;
	if (isZodSchema(schema)) {
		return isZodV4Schema(schema) ? serializeV4(schema, audience) : serializeV3(schema, audience);
	}
	return isJsonSchemaObject(schema) ? schema : null;
}

/**
 * Serialize for a provider tool definition, closing every object to unknown
 * keys. Raw JSON Schema passes through untouched. Throws if unserializable.
 */
export function toModelJsonSchema(schema?: unknown): JSONSchema7 | null {
	return serialize(schema, 'model');
}

/**
 * Serialize for validating data against, leaving each object's own unknown-key
 * policy intact. Raw JSON Schema passes through untouched. Throws if
 * unserializable.
 *
 * The result is a contract check, not a filter: unlike Zod, `parseWithSchema`
 * returns JSON Schema-branch data unchanged, so any unknown key it accepts also
 * reaches the handler.
 */
export function toValidationJsonSchema(schema?: unknown): JSONSchema7 | null {
	return serialize(schema, 'validation');
}

/**
 * As above, but returns `null` instead of throwing. Prefer the throwing
 * variants where a caller can report the failure — a `null` here is
 * indistinguishable from "no schema was supplied".
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
