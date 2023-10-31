export function isObjectOrArray(maybeObject: unknown): maybeObject is { [key: string]: string } {
	return typeof maybeObject === 'object' && maybeObject !== null;
}

export function isObject(maybeObject: unknown): maybeObject is { [key: string]: string } {
	return isObjectOrArray(maybeObject) && !Array.isArray(maybeObject);
}

export const searchInObject = (obj: unknown, searchString: string): boolean =>
	(Array.isArray(obj) ? obj : Object.entries(obj)).some((entry) =>
		isObjectOrArray(entry)
			? searchInObject(entry, searchString)
			: entry?.toString().includes(searchString),
	);
