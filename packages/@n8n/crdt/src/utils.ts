import type { CRDTArray, CRDTDoc, CRDTMap } from './types';

/**
 * Recursively convert a plain JavaScript value to deep CRDT structures.
 * - Objects become CRDTMap with nested values also converted
 * - Arrays become CRDTArray with nested values also converted
 * - Primitives (string, number, boolean, null) are stored as-is
 *
 * This enables fine-grained conflict resolution for concurrent edits
 * to different fields within the same object or array.
 *
 * @param doc - The CRDT document to create nested structures in
 * @param value - The plain JavaScript value to convert
 * @returns The converted value (CRDTMap, CRDTArray, or primitive)
 *
 * @example
 * ```ts
 * const params = { operation: 'update', fields: [{ name: 'field1' }] };
 * const crdtParams = seedValueDeep(doc, params);
 * // crdtParams is now a CRDTMap with nested CRDTArray for 'fields'
 * ```
 */
export function seedValueDeep(doc: CRDTDoc, value: unknown): unknown {
	if (Array.isArray(value)) {
		const arr: CRDTArray<unknown> = doc.createArray();
		for (const item of value) {
			arr.push(seedValueDeep(doc, item));
		}
		return arr;
	}

	if (value !== null && typeof value === 'object') {
		const map: CRDTMap<unknown> = doc.createMap();
		for (const [k, v] of Object.entries(value)) {
			map.set(k, seedValueDeep(doc, v));
		}
		return map;
	}

	// Primitives (string, number, boolean, null, undefined) stored as-is
	return value;
}

/**
 * Convert any CRDT value (CRDTMap, CRDTArray, or primitive) to plain JSON.
 * Handles nested structures recursively.
 *
 * @param value - The CRDT value to convert
 * @returns Plain JavaScript value
 */
export function toJSON(value: unknown): unknown {
	if (value === null || value === undefined) {
		return value;
	}

	// Check if it's a CRDTMap or CRDTArray (has toJSON method)
	if (typeof value === 'object' && 'toJSON' in value && typeof value.toJSON === 'function') {
		return (value as { toJSON: () => unknown }).toJSON();
	}

	return value;
}
