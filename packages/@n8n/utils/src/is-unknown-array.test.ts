import { describe, expect, expectTypeOf, it } from 'vitest';

import { isUnknownArray } from './is-unknown-array';

describe('isUnknownArray', () => {
	it('returns true for arrays', () => {
		expect(isUnknownArray([])).toBe(true);
		expect(isUnknownArray([1, 'two', null])).toBe(true);
	});

	it('returns false for array-like and other objects', () => {
		expect(isUnknownArray({ length: 1 })).toBe(false);
		expect(isUnknownArray({})).toBe(false);
		expect(isUnknownArray(new Set([1]))).toBe(false);
	});

	it('returns false for primitives and nullish values', () => {
		expect(isUnknownArray('abc')).toBe(false);
		expect(isUnknownArray(42)).toBe(false);
		expect(isUnknownArray(null)).toBe(false);
		expect(isUnknownArray(undefined)).toBe(false);
	});

	it('narrows elements to unknown rather than any', () => {
		const value: unknown = ['a'];
		if (isUnknownArray(value)) {
			expectTypeOf(value).toEqualTypeOf<readonly unknown[]>();
			expectTypeOf(value[0]).toEqualTypeOf<unknown>();
		}
	});
});
