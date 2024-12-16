type ObjectOrArray = Record<string, unknown> | unknown[];

export function isDateObject(maybeDate: unknown): maybeDate is Date {
	return maybeDate instanceof Date;
}

export function isObjectOrArray(maybeObject: unknown): maybeObject is ObjectOrArray {
	return typeof maybeObject === 'object' && maybeObject !== null && !isDateObject(maybeObject);
}

export function isObject(maybeObject: unknown): maybeObject is Record<string, unknown> {
	return isObjectOrArray(maybeObject) && !Array.isArray(maybeObject);
}

export const searchInObject = (obj: ObjectOrArray, searchString: string): boolean =>
	(Array.isArray(obj) ? obj : Object.entries(obj)).some((entry) =>
		isObjectOrArray(entry)
			? searchInObject(entry, searchString)
			: entry?.toString().toLowerCase().includes(searchString.toLowerCase()),
	);

/**
 * Efficiently and deeply compare two objects. Handles nested objects and arrays.
 * Returns true if they are equal, false otherwise.
 */
export function deepCompare<T extends object>(
	obj1: T | null | undefined,
	obj2: T | null | undefined,
): boolean {
	if (obj1 === obj2) return true;
	if (obj1 === null || obj2 === null) return false;
	if (obj1 === undefined || obj2 === undefined) return false;

	// Get keys of both objects
	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	// Check if number of keys is the same
	if (keys1.length !== keys2.length) return false;

	// Compare each key-value pair recursively
	return keys1.every((key) => {
		const val1 = obj1[key as keyof T];
		const val2 = obj2[key as keyof T];

		// Handle arrays
		if (Array.isArray(val1) && Array.isArray(val2)) {
			if (val1.length !== val2.length) return false;
			return val1.every((item, index) => {
				if (typeof item === 'object' && item !== null) {
					return deepCompare(item, val2[index]);
				}
				return item === val2[index];
			});
		}

		// Handle nested objects
		if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
			return deepCompare(val1, val2);
		}

		// Handle primitive values
		return val1 === val2;
	});
}
