import { describe, it, expect } from 'vitest';

import { extendedFunctions } from '../function-extensions';

const zip = extendedFunctions.zip;
const toPathSegment = extendedFunctions.toPathSegment;

describe('zip', () => {
	it('should pair keys with values', () => {
		expect(zip(['test1', 'test2', 'test3'], [1, 2, 3])).toEqual({
			test1: 1,
			test2: 2,
			test3: 3,
		});
	});

	it('should treat a key named __proto__ as an ordinary field', () => {
		const result = zip(['__proto__'], [{ marker: 'set' }]) as Record<string, unknown>;

		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
		expect(({} as Record<string, unknown>).marker).toBeUndefined();
	});
});

describe('toPathSegment', () => {
	it('encodes a value as one path segment', () => {
		expect(toPathSegment('a/b c')).toBe('a%2Fb%20c');
	});

	it.each(['', '.', '..', null, undefined])('rejects %s', (input) => {
		expect(() => toPathSegment(input)).toThrow('Invalid identifier');
	});
});
