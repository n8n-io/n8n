/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */

/**
 * Get a deeply nested value based on a given path string
 *
 * @param object
 * @param path
 * @returns {T}
 */
export function getValueByPath<T = any>(object: any, path: string): T {
	return path.split('.').reduce((acc, part) => {
		return acc && acc[part];
	}, object);
}
