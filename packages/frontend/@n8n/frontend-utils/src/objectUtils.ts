/**
 * Freezes a value and every nested object and array, and returns the same reference.
 * It skips an object that is already frozen, so the children of an input that is
 * frozen only at the top level stay mutable.
 */
export function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const child of Object.values(value)) deepFreeze(child);
	}
	return value;
}
