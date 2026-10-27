import { types } from 'node:util';

export interface UnusableValue {
	path: Array<string | number>;
	/** Completes the sentence "it is …", e.g. `a function`. */
	kind: string;
}

export interface TransferSafeValue {
	value: unknown;
	unusable: UnusableValue[];
}

const UNUSABLE = Symbol('unusable');

/**
 * Rebuild a value that structured clone rejects, for example the Proxy objects
 * that vm2 hands out, from plain objects, arrays, Dates, Maps, Sets, RegExps
 * and Errors.
 * Functions, symbols, WeakMaps, WeakSets, Promises and circular references are
 * left out, and their paths are returned in `unusable`.
 */
export function toTransferSafe(root: unknown): TransferSafeValue {
	const unusable: UnusableValue[] = [];
	const path: Array<string | number> = [];
	const ancestors = new Set<object>();

	const markUnusable = (kind: string) => {
		unusable.push({ path: [...path], kind });
		return UNUSABLE;
	};

	const walkChild = (key: string | number, value: unknown) => {
		path.push(key);
		const result = walk(value);
		path.pop();
		return result;
	};

	// Map and Set entries have no path to put a throwing getter on, so an
	// unusable entry makes the whole collection unusable.
	const walkCollection = (
		kind: 'Map' | 'Set',
		rebuild: () => Map<unknown, unknown> | Set<unknown>,
	) => {
		const before = unusable.length;
		const copy = rebuild();
		if (unusable.length === before) return copy;
		const [first] = unusable.splice(before);
		return markUnusable(`a ${kind} that contains ${first.kind}`);
	};

	const walk = (value: unknown): unknown => {
		if (typeof value === 'function') return markUnusable('a function');
		if (typeof value === 'symbol') return markUnusable('a symbol');
		if (value === null || typeof value !== 'object') return value;
		if (value instanceof Date) return new Date(value.getTime());
		if (
			!types.isProxy(value) &&
			(ArrayBuffer.isView(value) ||
				value instanceof ArrayBuffer ||
				value instanceof RegExp ||
				value instanceof Error)
		) {
			return value;
		}
		if (value instanceof RegExp) return new RegExp(value.source, value.flags);
		if (value instanceof Error) {
			const copy = new Error(value.message);
			copy.name = value.name;
			copy.stack = value.stack;
			return copy;
		}
		if (value instanceof WeakMap) return markUnusable('a WeakMap');
		if (value instanceof WeakSet) return markUnusable('a WeakSet');
		if (value instanceof Promise) return markUnusable('a Promise');
		if (ancestors.has(value)) return markUnusable('a circular reference');

		ancestors.add(value);
		try {
			if (Array.isArray(value)) {
				const copy: unknown[] = new Array(value.length);
				for (let i = 0; i < value.length; i++) {
					const element = walkChild(i, value[i]);
					copy[i] = element === UNUSABLE ? undefined : element;
				}
				return copy;
			}
			if (value instanceof Map) {
				return walkCollection('Map', () => {
					const copy = new Map<unknown, unknown>();
					value.forEach((v: unknown, k: unknown) => copy.set(walk(k), walk(v)));
					return copy;
				});
			}
			if (value instanceof Set) {
				return walkCollection('Set', () => {
					const copy = new Set<unknown>();
					value.forEach((v: unknown) => copy.add(walk(v)));
					return copy;
				});
			}
			const copy: Record<string, unknown> = {};
			for (const key of Object.keys(value)) {
				const child = walkChild(key, (value as Record<string, unknown>)[key]);
				if (child === UNUSABLE) continue;
				if (key === '__proto__') {
					Object.defineProperty(copy, key, {
						value: child,
						enumerable: true,
						writable: true,
						configurable: true,
					});
				} else {
					copy[key] = child;
				}
			}
			return copy;
		} finally {
			ancestors.delete(value);
		}
	};

	const value = walk(root);
	return { value: value === UNUSABLE ? undefined : value, unusable };
}

/**
 * `toTransferSafe` for the result of an item RPC: a single item or an array
 * of items. Each item is converted once per `cache`.
 */
export function toTransferSafeItems(
	result: unknown,
	cache: WeakMap<object, TransferSafeValue>,
): TransferSafeValue {
	const convert = (item: unknown) => {
		if (item === null || typeof item !== 'object') return toTransferSafe(item);
		let converted = cache.get(item);
		if (!converted) {
			converted = toTransferSafe(item);
			cache.set(item, converted);
		}
		return converted;
	};

	if (!Array.isArray(result)) return convert(result);

	const value: unknown[] = new Array(result.length);
	const unusable: UnusableValue[] = [];
	for (let i = 0; i < result.length; i++) {
		const converted = convert(result[i]);
		value[i] = converted.value;
		for (const entry of converted.unusable) {
			unusable.push({ path: [i, ...entry.path], kind: entry.kind });
		}
	}
	return { value, unusable };
}
