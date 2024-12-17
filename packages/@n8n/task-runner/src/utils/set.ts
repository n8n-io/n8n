/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Replacement of lodash _.set
 *
 * @example
 * const obj = {};
 * set(obj, ['a', 'b'], 4);
 * console.log(obj); // { a: { b: 4 } }
 */
export function set<T, U = T>(target: T, path: string[], value: unknown): U {
	let current = target as any;

	for (let i = 0; i < path.length; i++) {
		const key = path[i];

		const isLast = i === path.length - 1;
		if (isLast) {
			current[key] = value;
		} else {
			if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
				current[key] = {};
			}

			current = current[key];
		}
	}

	return target as unknown as U;
}
