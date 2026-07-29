export function invert<T extends Record<PropertyKey, PropertyKey>>(obj: T) {
	const result = {} as Record<T[keyof T], keyof T>;
	for (const key in obj) {
		result[obj[key]] = key;
	}
	return result;
}
