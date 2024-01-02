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
