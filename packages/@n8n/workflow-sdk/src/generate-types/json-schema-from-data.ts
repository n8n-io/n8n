/**
 * JSON Schema from Data Inferrer
 *
 * Infers a JSON Schema from a concrete data value.
 * Used to derive output shapes from execution history without
 * exposing the actual data values.
 */

import type { JsonSchema } from './generate-types';

/**
 * Infer a JSON Schema from a concrete data value.
 *
 * Recursively inspects the value to produce a schema describing
 * its shape (types, property names, array item types) without
 * retaining any of the original values.
 */
export function generateJsonSchemaFromData(value: unknown): JsonSchema {
	if (value === null || value === undefined) {
		return { type: 'null' };
	}

	const type = typeof value;

	if (type === 'string') return { type: 'string' };
	if (type === 'number') return { type: 'number' };
	if (type === 'boolean') return { type: 'boolean' };

	if (Array.isArray(value)) {
		return {
			type: 'array',
			items: value.length > 0 ? generateJsonSchemaFromData(value[0]) : {},
		};
	}

	if (type === 'object') {
		const properties: Record<string, JsonSchema> = {};
		for (const [key, propValue] of Object.entries(value as Record<string, unknown>)) {
			properties[key] = generateJsonSchemaFromData(propValue);
		}
		const keys = Object.keys(properties);
		return {
			type: 'object',
			properties,
			...(keys.length > 0 && { required: keys }),
		};
	}

	return { type: 'string' };
}
