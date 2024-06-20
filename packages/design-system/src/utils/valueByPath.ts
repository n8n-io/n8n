/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Get a deeply nested value based on a given path string
 *
 * @param object
 * @param path
 * @returns {T}
 */
export function getValueByPath<T = any>(object: any, path: string): T {
	return path.split('.').reduce((acc, part) => {
		return acc?.[part];
	}, object);
}
