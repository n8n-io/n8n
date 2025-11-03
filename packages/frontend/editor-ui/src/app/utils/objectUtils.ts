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
 * Calculate the size of a stringified object in KB.
 * @param {unknown} obj - The object to calculate the size of
 * @returns {number} The size of the object in KB
 * @throws {Error} If the object is not serializable
 */
export const getObjectSizeInKB = (obj: unknown): number => {
	if (obj === null || obj === undefined) {
		return 0;
	}

	if (
		(typeof obj === 'object' && Object.keys(obj).length === 0) ||
		(Array.isArray(obj) && obj.length === 0)
	) {
		// "{}" and "[]" both take 2 bytes in UTF-8
		return Number((2 / 1024).toFixed(2));
	}

	try {
		const str = JSON.stringify(obj);
		// Using TextEncoder to get actual UTF-8 byte length (what we see in chrome dev tools)
		const bytes = new TextEncoder().encode(str).length;
		const kb = bytes / 1024;
		return Number(kb.toFixed(2));
	} catch (error) {
		throw new Error(
			`Failed to calculate object size: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
};

export function omitKey<T extends Record<string, unknown>, S extends string>(
	obj: T,
	key: S,
): Omit<T, S> {
	return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key)) as Omit<T, S>;
}
