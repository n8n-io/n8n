import { describe, it, expect } from 'vitest';

import { extendedFunctions } from '../function-extensions';

const zip = extendedFunctions.zip;

const numberList = extendedFunctions.numberList as (
	start: number,
	end: number,
) => number[];

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

describe('numberList', () => {
	it('should list integers between valid bounds', () => {
		expect(numberList(1, 3)).toEqual([1, 2, 3]);
	});

	it('should reject a NaN bound', () => {
		expect(() => numberList(Number.NaN, 5)).toThrow(
			'numberList(): expected integer args, e.g. numberList(1, 10)',
		);
	});

	it('should reject a fractional bound', () => {
		expect(() => numberList(1.5, 5)).toThrow(
			'numberList(): expected integer args, e.g. numberList(1, 10)',
		);
	});

	it('should reject a non-number bound', () => {
		expect(() => numberList('1' as unknown as number, 5)).toThrow(
			'numberList(): expected integer args, e.g. numberList(1, 10)',
		);
	});
});
