import type { IDataObject } from 'n8n-workflow';

type DataValue = IDataObject[string];

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Walk `path` through `obj`, replace each matched leaf with `replacement`
 * (default `undefined`), and return the collected leaf value(s).
 *
 * Path syntax:
 *   - Dot notation for object navigation: `a.b.c`
 *   - `*` inside a key matches any characters in that key: `headers.x-auth-*`
 *   - `[*]` suffix on a key iterates over each array element: `tags[*]`, `headers.auth[*].value`
 *
 * Return shape:
 *   - 0 matches    → undefined
 *   - 1 match      → the bare value (unwrapped)
 *   - 2+ matches   → array in encounter order
 *
 * Mutation:
 *   - Each matched leaf is replaced with `replacement` in `obj` (key preserved).
 *   - Missing intermediates / type mismatches are silent: no mutation, no value collected for that branch.
 *   - Only own properties match. The segments `__proto__`, `constructor` and `prototype` never match.
 */
export function extractAndClear(
	obj: IDataObject,
	path: string,
	replacement?: DataValue,
): DataValue | undefined {
	const segments = path.split('.');
	if (segments.some((segment) => UNSAFE_KEYS.has(stripArraySuffix(segment)))) return undefined;

	const collected: DataValue[] = [];
	walk(obj, segments, 0, collected, replacement);
	if (collected.length === 0) return undefined;
	if (collected.length === 1) return collected[0];
	return collected;
}

function stripArraySuffix(segment: string): string {
	return segment.endsWith('[*]') ? segment.slice(0, -3) : segment;
}

function isIDataObject(v: DataValue): v is IDataObject {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Linear-time glob match: `*` matches any run of characters. No regex is used. */
export function globMatch(pattern: string, text: string): boolean {
	let p = 0;
	let t = 0;
	let starIndex = -1;
	let matchIndex = 0;
	while (t < text.length) {
		if (p < pattern.length && pattern[p] === '*') {
			starIndex = p;
			matchIndex = t;
			p++;
		} else if (p < pattern.length && pattern[p] === text[t]) {
			p++;
			t++;
		} else if (starIndex !== -1) {
			p = starIndex + 1;
			matchIndex++;
			t = matchIndex;
		} else {
			return false;
		}
	}
	while (p < pattern.length && pattern[p] === '*') p++;
	return p === pattern.length;
}

function matchingKeys(current: IDataObject, key: string): string[] {
	if (!key.includes('*')) {
		return Object.prototype.hasOwnProperty.call(current, key) ? [key] : [];
	}
	return Object.keys(current).filter((k) => !UNSAFE_KEYS.has(k) && globMatch(key, k));
}

function walk(
	current: DataValue,
	segments: string[],
	index: number,
	collected: DataValue[],
	replacement: DataValue,
): void {
	if (!isIDataObject(current)) return;
	const segment = segments[index];
	const isWildcard = segment.endsWith('[*]');
	const keyPattern = stripArraySuffix(segment);
	const isLast = index === segments.length - 1;

	for (const key of matchingKeys(current, keyPattern)) {
		if (isWildcard) {
			const arr = current[key];
			if (!Array.isArray(arr)) continue;
			// Cast once: Array.isArray narrows to any[], so subsequent reads/writes need a typed view.
			// `undefined` writes are legal against IDataObject[] because GenericValue includes undefined.
			const typedArr = arr as DataValue[];
			if (isLast) {
				for (let i = 0; i < typedArr.length; i++) {
					collected.push(typedArr[i]);
					typedArr[i] = replacement;
				}
			} else {
				for (const element of typedArr) walk(element, segments, index + 1, collected, replacement);
			}
			continue;
		}

		if (isLast) {
			collected.push(current[key]);
			current[key] = replacement;
		} else {
			walk(current[key], segments, index + 1, collected, replacement);
		}
	}
}
