import { describe, it, expect } from 'vitest';

import { objectExtensions } from '../object-extensions';

const compact = objectExtensions.functions.compact as (value: object) => object;
const urlEncode = objectExtensions.functions.urlEncode as (value: object) => string;
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


describe('urlEncode', () => {
	// This file mirrors packages/workflow/src/extensions/object-extensions.ts,
	// which uses URLSearchParams. These assertions are what URLSearchParams
	// produces for the same input.
	const LONE_HIGH_SURROGATE = String.fromCharCode(0xd800);
	const LONE_LOW_SURROGATE = String.fromCharCode(0xdfff);

	it('should encode an ordinary object the way URLSearchParams does', () => {
		expect(urlEncode({ a: '1', 'b c': "d&e=f!'()~" })).toBe(
			new URLSearchParams({ a: '1', 'b c': "d&e=f!'()~" }).toString(),
		);
	});

	it('should replace a lone surrogate rather than throwing', () => {
		// JSON.parse('{"a":"\\ud800"}') and slicing between the halves of a
		// surrogate pair both produce one of these.
		expect(urlEncode({ v: LONE_HIGH_SURROGATE })).toBe('v=%EF%BF%BD');
		expect(urlEncode({ v: LONE_LOW_SURROGATE })).toBe('v=%EF%BF%BD');
		expect(urlEncode({ [LONE_HIGH_SURROGATE]: 'x' })).toBe('%EF%BF%BD=x');
	});

	it('should leave a well-formed surrogate pair alone', () => {
		expect(urlEncode({ v: '😀' })).toBe(new URLSearchParams({ v: '😀' }).toString());
	});
});
