import type { IDataObject } from 'n8n-workflow';

export function isObject(maybe: unknown): maybe is { [key: string]: unknown } {
	return (
		typeof maybe === 'object' && maybe !== null && !Array.isArray(maybe) && !(maybe instanceof Date)
	);
}

function isTraversable(maybe: unknown): maybe is IDataObject {
	return isObject(maybe) && typeof maybe.toJSON !== 'function' && Object.keys(maybe).length > 0;
}

/**
 * Stringify any non-standard JS objects (e.g. `Date`, `RegExp`) inside output items at any depth.
 */
export function standardizeOutput(output: IDataObject) {
	function standardizeOutputRecursive(obj: IDataObject, knownObjects = new WeakSet()): IDataObject {
		for (const [key, value] of Object.entries(obj)) {
			if (!isTraversable(value)) continue;

			if (typeof value === 'object' && value !== null) {
				if (knownObjects.has(value)) {
					// Found circular reference
					continue;
				}
				knownObjects.add(value);
			}

			obj[key] =
				value.constructor.name !== 'Object'
					? JSON.stringify(value) // Date, RegExp, etc.
					: standardizeOutputRecursive(value, knownObjects);
		}
		return obj;
	}
	standardizeOutputRecursive(output);
	return output;
}

export type CodeNodeMode = 'runOnceForAllItems' | 'runOnceForEachItem';

export const REQUIRED_N8N_ITEM_KEYS = new Set(['json', 'binary', 'pairedItem']);
