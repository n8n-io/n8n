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

/**
 * Get a nested value from a CRDT structure by path.
 *
 * @param root - The root CRDTMap or plain object
 * @param path - Array of keys to traverse (e.g., ['assignments', 'assignments', '0', 'name'])
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(
	root: CRDTMap<unknown> | Record<string, unknown>,
	path: string[],
): unknown {
	let current: unknown = root;

	for (const key of path) {
		if (current === null || current === undefined) {
			return undefined;
		}

		if (typeof current === 'object' && 'get' in current && typeof current.get === 'function') {
			// CRDTMap - use get method
			current = (current as CRDTMap<unknown>).get(key);
		} else if (Array.isArray(current)) {
			// Regular array - use index
			const index = parseInt(key, 10);
			current = isNaN(index) ? undefined : current[index];
		} else if (typeof current === 'object') {
			// Plain object - use property access
			current = (current as Record<string, unknown>)[key];
		} else {
			return undefined;
		}
	}

	return current;
}

/**
 * Set a nested value in a CRDT structure by path.
 * Creates intermediate CRDTMaps/CRDTArrays as needed.
 *
 * @param doc - The CRDT document for creating nested structures
 * @param root - The root CRDTMap to modify
 * @param path - Array of keys to traverse
 * @param value - The value to set (will be deep-seeded if object/array)
 */
export function setNestedValue(
	doc: CRDTDoc,
	root: CRDTMap<unknown>,
	path: string[],
	value: unknown,
): void {
	if (path.length === 0) {
		return;
	}

	let current: CRDTMap<unknown> = root;

	// Navigate to parent of target
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i];
		let next: unknown = current.get(key);

		if (next === null || next === undefined) {
			// Create intermediate CRDTMap
			const newMap = doc.createMap();
			current.set(key, newMap);
			next = newMap;
		}

		if (
			typeof next === 'object' &&
			next !== null &&
			'get' in next &&
			typeof (next as CRDTMap<unknown>).get === 'function'
		) {
			current = next as CRDTMap<unknown>;
		} else {
			// Path doesn't exist or isn't a map, can't continue
			return;
		}
	}

	// Set the final value (deep-seed if it's an object/array)
	const finalKey = path[path.length - 1];
	current.set(finalKey, seedValueDeep(doc, value));
}
