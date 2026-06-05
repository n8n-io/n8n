import type { JSONObject, JSONValue } from '../types/utils/json';

export function toJsonValue(value: unknown, seen = new WeakSet<object>()): JSONValue {
	if (value === null || typeof value === 'string' || typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
		return null;
	}

	if (typeof value === 'bigint') {
		return value.toString();
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
		};
	}

	if (Array.isArray(value)) {
		return value.map((entry) => toJsonValue(entry, seen));
	}

	if (typeof value === 'object') {
		if (seen.has(value)) {
			return '[Circular]';
		}

		seen.add(value);
		const result: JSONObject = {};
		for (const [key, entryValue] of Object.entries(value)) {
			result[key] = toJsonValue(entryValue, seen);
		}
		seen.delete(value);
		return result;
	}

	return null;
}
