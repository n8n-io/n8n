import { toUint8Array } from 'js-base64';
import { describe, expect, it } from 'vitest';

import { decodeBase64 } from '../base64';

// Valid characters of both alphabets, padding, and characters that are not base64.
const CHARACTERS = [...'AQgwzZ09+/-_=', '@', '.', ' ', '\n', 'é', '\u0000', '\uD800'];

/** Gives a pseudo-random generator with a fixed seed, so a failure always reproduces. */
const createRandom = (seed: number) => {
	let state = seed;
	return (limit: number): number => {
		state = (state * 48271) % 2147483647;
		return state % limit;
	};
};

describe('decodeBase64', () => {
	it.each(['aGVsbG8=', 'aGVsbG8', 'aGVs bG8='])('decodes %j to the bytes of "hello"', (input) => {
		expect(decodeBase64(input)).toEqual(new TextEncoder().encode('hello'));
	});

	it('decodes base64url characters like their base64 equivalents', () => {
		expect(decodeBase64('a-b_')).toEqual(decodeBase64('a+b/'));
	});

	it('decodes like js-base64 toUint8Array on Node for random inputs', () => {
		const random = createRandom(1244);
		for (let run = 0; run < 20_000; run++) {
			const input = Array.from(
				{ length: random(40) },
				() => CHARACTERS[random(CHARACTERS.length)],
			).join('');
			expect(decodeBase64(input)).toEqual(toUint8Array(input));
		}
	});
});
