/**
 * Checks if a value is a plain object (not an array, null, or other type).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * This function performs a deep merge of two objects.
 * Source properties override target properties. Nested objects are merged recursively.
 * Arrays and non-object values from source replace those in target.
 *
 * @param target The target object to merge into.
 * @param source The source object to merge from.
 * @returns A new object that is the result of merging source into target.
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
	// Handle null/undefined source - return a shallow copy of target
	if (source === null || source === undefined) {
		return isPlainObject(target) ? { ...target } : target;
	}

	// Handle null/undefined target - return a shallow copy of source
	if (target === null || target === undefined) {
		return source as T;
	}

	// If either value is not a plain object, source wins
	if (!isPlainObject(target) || !isPlainObject(source)) {
		return source as T;
	}

	// Both are plain objects - perform deep merge
	const result = { ...target } as Record<string, unknown>;
	const sourceRecord = source as Record<string, unknown>;

	for (const key of Object.keys(sourceRecord)) {
		// Prevent prototype pollution
		if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;

		const sourceValue = sourceRecord[key];
		const targetValue = result[key];

		if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
			// Both values are objects - recurse
			result[key] = deepMerge(targetValue, sourceValue);
		} else {
			// Source value replaces target value
			result[key] = sourceValue;
		}
	}

	return result as T;
}
