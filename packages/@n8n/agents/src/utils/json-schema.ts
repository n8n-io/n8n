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
	const result = lockDefinition(schema);
	return typeof result === 'object' ? result : schema;
}

/**
 * `closeSelf: false` marks a subschema that is evaluated against the *same*
 * instance as its parent — closing it would reject the parent's own properties.
 */
function lockDefinition(schema: JSONSchema7Definition, closeSelf = true): JSONSchema7Definition {
	if (typeof schema !== 'object' || schema === null) return schema;

	const result: JSONSchema7 = { ...schema };

	// Normalise objects that list properties but omit the type (mirrors fixSchema).
	if (result.properties !== undefined && result.type === undefined) {
		result.type = 'object';
	}

	const isObjectSchema =
		result.type === 'object' ||
		(Array.isArray(result.type) && result.type.includes('object')) ||
		result.properties !== undefined;

	if (closeSelf && isObjectSchema && !composesOtherSchemas(result)) {
		result.additionalProperties ??= false;
	}

	for (const key of ['properties', 'patternProperties', '$defs', 'definitions'] as const) {
		const record = result[key];
		if (record) result[key] = lockDefinitions(record);
	}
	if (result.items !== undefined) {
		result.items = Array.isArray(result.items)
			? result.items.map((item) => lockDefinition(item))
			: lockDefinition(result.items);
	}
	if (typeof result.additionalProperties === 'object' && result.additionalProperties !== null) {
		result.additionalProperties = lockDefinition(result.additionalProperties);
	}
	// `anyOf`/`oneOf` branches are standalone alternatives that fully describe the
	// instance, so closing them is correct.
	for (const key of ['anyOf', 'oneOf'] as const) {
		const branch = result[key];
		if (Array.isArray(branch)) result[key] = branch.map((item) => lockDefinition(item));
	}
	if (Array.isArray(result.allOf)) {
		result.allOf = result.allOf.map((item) => lockDefinition(item, false));
	}
	for (const key of ['not', 'if', 'then', 'else'] as const) {
		if (result[key] !== undefined) result[key] = lockDefinition(result[key], false);
	}
	if (result.contains !== undefined) result.contains = lockDefinition(result.contains);

	return result;
}

const COMPOSITION_KEYWORDS = [
	'allOf',
	'anyOf',
	'oneOf',
	'$ref',
	'if',
	'then',
	'else',
	'dependencies',
	'dependentSchemas',
] as const;

/** Whether the node composes with other schemas that may contribute properties. */
function composesOtherSchemas(schema: JSONSchema7): boolean {
	const node = schema as Record<string, unknown>;
	return COMPOSITION_KEYWORDS.some((keyword) => node[keyword] !== undefined);
}

/**
 * Re-map a record of sub-schemas. Uses `Object.defineProperty` so a
 * user-supplied property name like `__proto__` becomes a normal own property
 * instead of mutating the prototype chain.
 */
function lockDefinitions(
	record: Record<string, JSONSchema7Definition>,
): Record<string, JSONSchema7Definition> {
	const out: Record<string, JSONSchema7Definition> = {};
	for (const [key, value] of Object.entries(record)) {
		Object.defineProperty(out, key, {
			value: lockDefinition(value),
			enumerable: true,
			writable: true,
			configurable: true,
		});
	}
	return out;
}
