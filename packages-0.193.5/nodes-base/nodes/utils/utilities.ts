/**
 * Creates an array of elements split into groups the length of `size`.
 * If `array` can't be split evenly, the final chunk will be the remaining
 * elements.
 *
 * @param {Array} array The array to process.
 * @param {number} [size=1] The length of each chunk
 * @returns {Array} Returns the new array of chunks.
 * @example
 *
 * chunk(['a', 'b', 'c', 'd'], 2)
 * // => [['a', 'b'], ['c', 'd']]
 *
 * chunk(['a', 'b', 'c', 'd'], 3)
 * // => [['a', 'b', 'c'], ['d']]
 */
import {DEFAULT_DEV_HASURA_URL} from './constants';

export function chunk(array: any[], size = 1) { // tslint:disable-line:no-any
	const length = array == null ? 0 : array.length;
	if (!length || size < 1) {
		return [];
	}
	let index = 0;
	let resIndex = 0;
	const result = new Array(Math.ceil(length / size));

	while (index < length) {
		result[resIndex++] = array.slice(index, (index += size));
	}
	return result;
}

/**
 * Takes a multidimensional array and converts it to a one-dimensional array.
 *
 * @param {Array} nestedArray The array to be flattened.
 * @returns {Array} Returns the new flattened array.
 * @example
 *
 * flatten([['a', 'b'], ['c', 'd']])
 * // => ['a', 'b', 'c', 'd']
 *
 */
export function flatten(nestedArray: any[][]) { // tslint:disable-line:no-any
	const result = [];

	(function loop(array: any[]) { // tslint:disable-line:no-any
		for (let i = 0; i < array.length; i++) {
			if (Array.isArray(array[i])) {
				loop(array[i]);
			} else {
				result.push(array[i]);
			}
		}
	})(nestedArray);

	return result;
}

export function getStageFromEnv(): string {
	const stage = process.env.NODE_ENV as string;
	return stage === undefined ? 'dev' : stage;
}

export function getHasuraUrl(): string {
	const data = process.env.HASURA_URL as string;
	if (data === undefined) {
		return DEFAULT_DEV_HASURA_URL;
	}
	return data;
}


export function  getHasuraAdminSecret(): string {
	const data = process.env.X_HASURA_ADMIN_SECRET as string;
	return data === undefined ? '' : data;
}

