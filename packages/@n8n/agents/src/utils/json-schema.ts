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

function lockDefinition(schema: JSONSchema7Definition): JSONSchema7Definition {
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

	if (isObjectSchema && result.additionalProperties === undefined) {
		result.additionalProperties = false;
	}

	if (result.properties) {
		result.properties = mapDefinitions(result.properties);
	}
	if (result.$defs) {
		result.$defs = mapDefinitions(result.$defs);
	}
	if (result.definitions) {
		result.definitions = mapDefinitions(result.definitions);
	}
	if (result.items !== undefined) {
		result.items = Array.isArray(result.items)
			? result.items.map(lockDefinition)
			: lockDefinition(result.items);
	}
	if (typeof result.additionalProperties === 'object' && result.additionalProperties !== null) {
		result.additionalProperties = lockDefinition(result.additionalProperties);
	}
	for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
		const branch = result[key];
		if (Array.isArray(branch)) {
			result[key] = branch.map(lockDefinition);
		}
	}
	if (result.not !== undefined) {
		result.not = lockDefinition(result.not);
	}

	return result;
}

/**
 * Re-map a record of sub-schemas, locking each value. Uses
 * `Object.defineProperty` so a user-supplied property name like `__proto__`
 * becomes a normal own property instead of mutating the prototype chain.
 */
function mapDefinitions(
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
