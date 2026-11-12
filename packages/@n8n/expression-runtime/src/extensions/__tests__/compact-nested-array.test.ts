import { describe, expect, it } from 'vitest';

import { objectExtensions } from '../object-extensions';

const compact = objectExtensions.functions.compact as (value: object) => object;

describe('compact() preserves nested arrays', () => {
	it('preserves a nested array instead of turning it into an object', () => {
		expect(compact({ items: [1, 2, 3], name: 'cart' })).toEqual({
			items: [1, 2, 3],
			name: 'cart',
		});
	});

	it('preserves arrays nested inside arrays', () => {
		const first = [1, 2];
		const second = [3, 4];
		const matrix = [first, second];
		expect(compact({ matrix })).toEqual({ matrix });
	});

	it('still compacts nested plain objects recursively', () => {
		expect(compact({ a: 1, nested: { drop: null, keep: 'x' } })).toEqual({
			a: 1,
			nested: { keep: 'x' },
		});
	});

	it('still removes empty arrays, null, undefined, "nil" and empty strings', () => {
		expect(compact({ arr: [], n: null, u: undefined, nil: 'nil', empty: '' })).toEqual({});
	});

	it('still keeps an own __proto__ field as an ordinary field', () => {
		const value = JSON.parse('{"keep": 1, "__proto__": {"marker": "set"}}') as object;
		const result = compact(value);
		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
	});
});
