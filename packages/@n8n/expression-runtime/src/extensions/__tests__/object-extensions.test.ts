import { describe, it, expect } from 'vitest';

import { objectExtensions } from '../object-extensions';

const compact = objectExtensions.functions.compact as (value: object) => object;
const hasField = objectExtensions.functions.hasField as (
	value: object,
	extraArgs: string[],
) => boolean;

describe('hasField', () => {
	it('should return true for a key served through has/get traps without an own property descriptor', () => {
		const target = { test1: 1 };
		const proxy = new Proxy(target, {
			has(_target, key) {
				return key === 'test2';
			},
			get(_target, key) {
				return key === 'test2' ? 'proxied value' : undefined;
			},
		});

		expect(hasField(proxy, ['test2'])).toBe(true);
	});
});

describe('compact', () => {
	it('should remove empty values', () => {
		expect(compact({ test1: 1, test2: '2', test3: undefined, test4: null })).toEqual({
			test1: 1,
			test2: '2',
		});
	});

	it('should keep an own __proto__ field as an ordinary field', () => {
		const value = JSON.parse('{"test1": 1, "__proto__": {"marker": "set"}}') as object;

		const result = compact(value);

		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
		expect(({} as Record<string, unknown>).marker).toBeUndefined();
	});
});
