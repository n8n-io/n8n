import type { IDataObject } from 'n8n-workflow';

type DataValue = IDataObject[string];

/**
 * Walk `path` through `obj`, replace each matched leaf with `undefined`,
 * and return the collected leaf value(s).
 *
 * Path syntax:
 *   - Dot notation for object navigation: `a.b.c`
 *   - `[*]` suffix on a key iterates over each array element: `tags[*]`, `headers.auth[*].value`
 *
 * Return shape:
 *   - 0 matches    → undefined
 *   - 1 match      → the bare value (unwrapped)
 *   - 2+ matches   → array in encounter order
 *
 * Mutation:
 *   - Each matched leaf is replaced with `undefined` in `obj` (key preserved).
 *   - Missing intermediates / type mismatches are silent: no mutation, no value collected for that branch.
 */
export function extractAndClear(obj: IDataObject, path: string): DataValue | undefined {
	const segments = path.split('.');
	const collected: DataValue[] = [];
	walk(obj, segments, 0, collected);
	if (collected.length === 0) return undefined;
	if (collected.length === 1) return collected[0];
	return collected;
}

function isIDataObject(v: DataValue): v is IDataObject {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function walk(current: DataValue, segments: string[], index: number, collected: DataValue[]): void {
	if (!isIDataObject(current)) return;
	const segment = segments[index];
	const isWildcard = segment.endsWith('[*]');
	const key = isWildcard ? segment.slice(0, -3) : segment;
	const isLast = index === segments.length - 1;

	if (isWildcard) {
		const arr = current[key];
		if (!Array.isArray(arr)) return;
		// Cast once: Array.isArray narrows to any[], so subsequent reads/writes need a typed view.
		// `undefined` writes are legal against IDataObject[] because GenericValue includes undefined.
		const typedArr = arr as DataValue[];
		if (isLast) {
			for (let i = 0; i < typedArr.length; i++) {
				collected.push(typedArr[i]);
				typedArr[i] = undefined;
			}
		} else {
			for (const element of typedArr) walk(element, segments, index + 1, collected);
		}
		return;
	}

	if (!(key in current)) return;
	if (isLast) {
		collected.push(current[key]);
		current[key] = undefined;
	} else {
		walk(current[key], segments, index + 1, collected);
	}
}
