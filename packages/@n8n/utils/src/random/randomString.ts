import { ALPHABET } from '@n8n/constants/alphabet';

import { randomInt } from '../random/randomInt';

export function randomString(length: number): string;
export function randomString(minLength: number, maxLength: number): string;
/**
 * Generates a random alphanumeric string of a specified length, or within a range of lengths.
 *
 * @param {number} minLength - If `maxLength` is not provided, this is the length of the string to generate. Otherwise, this is the lower bound of the range of possible lengths.
 * @param {number} [maxLength] - The upper bound of the range of possible lengths. If provided, the actual length of the string will be a random number between `minLength` and `maxLength`, inclusive.
 * @returns {string} A random alphanumeric string of the specified length or within the specified range of lengths.
 */
export function randomString(minLength: number, maxLength?: number): string {
	const length = maxLength === undefined ? minLength : randomInt(minLength, maxLength + 1);
	return [...crypto.getRandomValues(new Uint32Array(length))]
		.map((byte) => ALPHABET[byte % ALPHABET.length])
		.join('');
}
