export type JSONValue = null | string | number | boolean | JSONObject | JSONArray;

export type JSONObject = {
	[key: string]: JSONValue | undefined;
};

export type JSONArray = JSONValue[];

/**
 * Recursively converts an arbitrary value into a JSON-safe representation.
 *
 * Handles `Buffer`, `Date`, `Error`, `bigint`, circular references, and
 * non-finite numbers (`NaN`, `Infinity`). Values that have no JSON
 * representation (`undefined`, functions, symbols) become `null`.
 */
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

	if (Buffer.isBuffer(value)) {
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
			Object.defineProperty(result, key, {
				value: toJsonValue(entryValue, seen),
				enumerable: true,
				writable: true,
				configurable: true,
			});
		}
		seen.delete(value);
		return result;
	}

	return null;
}
