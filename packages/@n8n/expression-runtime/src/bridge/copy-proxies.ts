import { types } from 'node:util';

import { defineOwnValue, isPlainObject } from '../runtime/transfer';

/**
 * Copy proxy dates, arrays, and plain objects after structured clone fails.
 * Keep shared references and cycles without changing the source data.
 */
export function copyProxies(value: unknown, seen = new Map<object, object>()): unknown {
	if (typeof value !== 'object' || value === null) {
		return value;
	}
	const existing = seen.get(value);
	if (existing) {
		return existing;
	}
	if (value instanceof Date && types.isProxy(value)) {
		const copy = new Date(value.getTime());
		seen.set(value, copy);
		return copy;
	}
	// Keep other types intact so native transfer can reject unsupported proxies.
	if (!Array.isArray(value) && !isPlainObject(value)) {
		return value;
	}

	const copy: object = Array.isArray(value) ? new Array<unknown>(value.length) : {};
	// Register the copy before its children so a cycle resolves to this object.
	seen.set(value, copy);
	for (const [key, child] of Object.entries(value)) {
		defineOwnValue(copy, key, copyProxies(child, seen));
	}
	return copy;
}
