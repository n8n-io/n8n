import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

/**
 * Pure JSON Schema transforms used when handing a raw JSON Schema to a model
 * provider (tool input schemas and structured-output schemas).
 */

/**
 * Ensure `type: "object"` is present when an object lists `properties` but omits
 * the type — some providers require the explicit type.
 */
export const fixSchema = (schema: JSONSchema7): JSONSchema7 => {
	if (
		typeof schema === 'object' &&
		schema !== null &&
		'properties' in schema &&
		!('type' in schema)
	) {
		return { ...schema, type: 'object' as const };
	}
	return schema;
};

/**
 * Recursively set `additionalProperties: false` on every object in a JSON
 * Schema so it can be used as a *structured output* schema.
 *
 * This only applies the JSON Schema keyword — it closes objects to undeclared
 * keys. It is NOT a provider "strict mode": it does not require every property
 * to be in `required`, so declared-optional fields stay optional.
 *
 * Anthropic's structured output rejects any object that omits
 * `additionalProperties: false`. Zod schemas get this during conversion, but a
 * raw JSON Schema (e.g. typed into a workflow node) usually omits it.
 *
 * Returns a deep copy — the input schema is never mutated.
 */
export function lockAdditionalProperties(schema: JSONSchema7): JSONSchema7 {
	return mapObjectNodes(schema, (node) => {
		node.additionalProperties ??= false;
	});
}

/**
 * Recursively drop `additionalProperties: false` so a schema serialized for a
 * model can be reused to *validate* data.
 *
 * The two audiences want opposite answers and only one can be stored: a Zod
 * object strips unknown keys where its closed serialization rejects them, so
 * validating against the model-facing copy fails payloads the author's schema
 * accepts. Reopening cannot tell a deliberate `.strict()` from that artefact,
 * and errs towards accepting.
 *
 * Returns a deep copy — the input schema is never mutated.
 */
export function unlockAdditionalProperties(schema: JSONSchema7): JSONSchema7 {
	return mapObjectNodes(schema, (node) => {
		if (node.additionalProperties === false) delete node.additionalProperties;
	});
}

/** Deep-copy a schema, applying `apply` to every object-typed node. */
function mapObjectNodes(schema: JSONSchema7, apply: (node: JSONSchema7) => void): JSONSchema7 {
	const result = mapDefinition(schema, apply);
	return typeof result === 'object' ? result : schema;
}

function mapDefinition(
	schema: JSONSchema7Definition,
	apply: (node: JSONSchema7) => void,
): JSONSchema7Definition {
	if (typeof schema !== 'object' || schema === null) return schema;

	const result: JSONSchema7 = { ...schema };
	const recurse = (definition: JSONSchema7Definition) => mapDefinition(definition, apply);

	// Normalise objects that list properties but omit the type (mirrors fixSchema).
	if (result.properties !== undefined && result.type === undefined) {
		result.type = 'object';
	}

	const isObjectSchema =
		result.type === 'object' ||
		(Array.isArray(result.type) && result.type.includes('object')) ||
		result.properties !== undefined;

	if (isObjectSchema) apply(result);

	if (result.properties) {
		result.properties = mapDefinitions(result.properties, apply);
	}
	if (result.$defs) {
		result.$defs = mapDefinitions(result.$defs, apply);
	}
	if (result.definitions) {
		result.definitions = mapDefinitions(result.definitions, apply);
	}
	if (result.items !== undefined) {
		result.items = Array.isArray(result.items) ? result.items.map(recurse) : recurse(result.items);
	}
	if (typeof result.additionalProperties === 'object' && result.additionalProperties !== null) {
		result.additionalProperties = recurse(result.additionalProperties);
	}
	for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
		const branch = result[key];
		if (Array.isArray(branch)) {
			result[key] = branch.map(recurse);
		}
	}
	if (result.not !== undefined) {
		result.not = recurse(result.not);
	}

	return result;
}

/**
 * Re-map a record of sub-schemas. Uses `Object.defineProperty` so a
 * user-supplied property name like `__proto__` becomes a normal own property
 * instead of mutating the prototype chain.
 */
function mapDefinitions(
	record: Record<string, JSONSchema7Definition>,
	apply: (node: JSONSchema7) => void,
): Record<string, JSONSchema7Definition> {
	const out: Record<string, JSONSchema7Definition> = {};
	for (const [key, value] of Object.entries(record)) {
		Object.defineProperty(out, key, {
			value: mapDefinition(value, apply),
			enumerable: true,
			writable: true,
			configurable: true,
		});
	}
	return out;
}
