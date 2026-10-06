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

/**
 * Output properties that hold per-account custom fields. Their keys belong to
 * whichever account recorded the fixture, so only the container is knowable.
 * The name alone proves nothing about the container, though — Pipedrive's
 * `search` operations return `custom_fields` as an array — so the collapse
 * applies only where the sample really holds an object.
 */
const OPAQUE_OUTPUT_PROPERTIES = new Set(['custom_fields']);

/**
 * A key that identifies a record instead of naming a field: a UUID, or a long
 * hex digest such as a Pipedrive custom-field key.
 */
const OPAQUE_KEY =
	/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32,})$/i;

/**
 * A fixture is one sample, not a contract. It cannot prove a property is
 * always present, and a property that happened to be null says nothing about
 * the type it carries when set — so `required` is dropped and null widens to
 * unknown. This also matches the pre-existing corpus, where `required` is
 * near-absent.
 */
export function relaxInferredSchema(schema: JsonSchema): JsonSchema {
	if (schema.type === 'null') return {};

	if (schema.type === 'array') {
		return { type: 'array', items: schema.items ? relaxInferredSchema(schema.items) : {} };
	}

	if (schema.type === 'object' && schema.properties) {
		const named: Record<string, JsonSchema> = {};
		const keyedByRecordId: JsonSchema[] = [];

		for (const [key, value] of Object.entries(schema.properties)) {
			const relaxed: JsonSchema =
				OPAQUE_OUTPUT_PROPERTIES.has(key) && value.type === 'object'
					? { type: 'object' }
					: relaxInferredSchema(value);
			if (OPAQUE_KEY.test(key)) keyedByRecordId.push(relaxed);
			else named[key] = relaxed;
		}

		// An object of nothing but record ids is a map, so describe its value
		// shape once and let consumers read `Record<string, T>`. Record ids mixed
		// in with real fields are just the ids the recording account happened to
		// hold, so they are dropped rather than pinned as fields.
		if (keyedByRecordId.length > 0 && Object.keys(named).length === 0) {
			return { type: 'object', additionalProperties: keyedByRecordId.reduce(mergeSchemas) };
		}

		return { type: 'object', properties: named };
	}

	return schema;
}

function unionTypes(a: JsonSchema['type'], b: JsonSchema['type']): JsonSchema['type'] {
	const types = [...new Set([a ?? [], b ?? []].flat())].sort();
	return types.length === 1 ? types[0] : types;
}

/**
 * Union two samples of the same (resource, operation). Several fixtures often
 * cover one operation with different scenarios — a minimal response and a full
 * one — so keeping only the first drops fields the node really returns.
 */
function isSchemaValue(value: boolean | JsonSchema | undefined): value is JsonSchema {
	return typeof value === 'object';
}

export function mergeSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
	if (a.type === undefined) return b;
	if (b.type === undefined) return a;

	if (a.type === 'object' && b.type === 'object') {
		return mergeObjectSchemas(a, b);
	}

	if (a.type === 'array' && b.type === 'array') {
		return { type: 'array', items: mergeSchemas(a.items ?? {}, b.items ?? {}) };
	}

	return a.type === b.type ? a : { type: unionTypes(a.type, b.type) };
}

/**
 * One object can reach this as named fields in one fixture and as a record-id
 * map in another — an empty map recorded next to a populated one is enough.
 * Both halves are merged independently so the sorted fixture order can never
 * erase a shape.
 */
function mergeObjectSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
	const properties: Record<string, JsonSchema> = { ...a.properties };
	for (const [key, value] of Object.entries(b.properties ?? {})) {
		const existing = properties[key];
		properties[key] = existing ? mergeSchemas(existing, value) : value;
	}

	const maps = [a.additionalProperties, b.additionalProperties].filter(isSchemaValue);
	if (maps.length === 0) return { type: 'object', properties };

	const additionalProperties = maps.reduce(mergeSchemas);
	return Object.keys(properties).length === 0
		? { type: 'object', additionalProperties }
		: { type: 'object', properties, additionalProperties };
}

/** The schema of the items of one run: each item relaxed, then merged. */
export function sampleSchemaOf(samples: readonly unknown[]): JsonSchema {
	return samples
		.map((sample) => relaxInferredSchema(generateJsonSchemaFromData(sample)))
		.reduce(mergeSchemas, {});
}
