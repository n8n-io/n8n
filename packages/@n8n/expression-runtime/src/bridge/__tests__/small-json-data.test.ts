import { describe, expect, it, vi } from 'vitest';

import { isSmallJsonData } from '../small-json-data';

describe('isSmallJsonData', () => {
	it.each([
		{ label: 'an object of JSON values', value: { a: 1, b: 'text', c: null, d: true, e: [] } },
		{ label: 'an array of objects', value: [{ id: 1 }, { id: 2, tags: ['a'] }] },
		{ label: 'an empty object', value: {} },
		{ label: 'an object without a prototype', value: Object.assign(Object.create(null), { a: 1 }) },
		{ label: 'a __proto__ data key', value: JSON.parse('{"__proto__": {"a": 1}}') as unknown },
	])('accepts $label', ({ value }) => {
		expect(isSmallJsonData(value, 1000)).toBe(true);
	});

	it.each([
		{ label: 'a string', value: 'text' },
		{ label: 'null', value: null },
		{ label: 'undefined in an object', value: { a: undefined } },
		{ label: 'undefined in an array', value: [undefined] },
		{ label: 'NaN', value: { a: NaN } },
		{ label: 'Infinity', value: { a: Infinity } },
		{ label: '-0', value: { a: -0 } },
		{ label: 'a bigint', value: { a: 1n } },
		{ label: 'a symbol', value: { a: Symbol('a') } },
		{ label: 'a function', value: { a: () => 1 } },
		{ label: 'a Date', value: { a: new Date(0) } },
		{ label: 'an Error', value: { a: new Error('failed') } },
		{ label: 'a Map', value: { a: new Map() } },
		{ label: 'a class instance', value: { a: new (class Point {})() } },
		{ label: 'a sparse array', value: [1, , 3] },
		{ label: 'an array with a named key', value: Object.assign([1], { name: 'x' }) },
		{
			label: 'an array with a hole and a named key',
			value: Object.assign(new Array<number>(2), { 0: 1, name: 'x' }),
		},
		{ label: 'an array subclass', value: { rows: new (class Rows extends Array<number> {})() } },
		{
			label: 'a key that is not enumerable',
			value: Object.defineProperty({ a: 1 }, 'hidden', { value: 2, enumerable: false }),
		},
		{
			label: 'an array with a key that is not enumerable',
			value: Object.defineProperty([1], 'hidden', { value: 2, enumerable: false }),
		},
		{ label: 'a symbol key', value: { a: 1, [Symbol('s')]: 2 } },
		{ label: 'a transfer type key', value: { a: { __n8nType: 'HostData' } } },
		{ label: 'an error flag key', value: { __isError: true } },
	])('rejects $label', ({ value }) => {
		expect(isSmallJsonData(value, 1000)).toBe(false);
	});

	it('rejects an accessor without calling it', () => {
		const read = vi.fn(() => 1);
		const value = Object.defineProperty({}, 'count', { get: read, enumerable: true });

		expect(isSmallJsonData(value, 1000)).toBe(false);
		expect(read).not.toHaveBeenCalled();
	});

	it('rejects data that refers to itself', () => {
		const value: Record<string, unknown> = { a: 1 };
		value.self = value;

		expect(isSmallJsonData(value, 1_000_000)).toBe(false);
	});

	it('rejects data when a proxy trap throws', () => {
		const value = new Proxy(
			{ a: 1 },
			{
				ownKeys() {
					throw new Error('not ready');
				},
			},
		);

		expect(isSmallJsonData(value, 1000)).toBe(false);
	});

	it('counts the characters of keys and strings', () => {
		const value = { text: 'x'.repeat(100) };

		expect(isSmallJsonData(value, 200)).toBe(true);
		expect(isSmallJsonData(value, 100)).toBe(false);
	});

	it('counts each value that is not a string', () => {
		// The keys take 290 characters. The limit of 500 is passed only when the values count.
		const value = Object.fromEntries(
			Array.from({ length: 100 }, (_, index) => [`f${index}`, index]),
		);

		expect(isSmallJsonData(value, 10_000)).toBe(true);
		expect(isSmallJsonData(value, 500)).toBe(false);
	});

	it.each([0, -1])('rejects all data for a limit of %d', (maxChars) => {
		expect(isSmallJsonData({}, maxChars)).toBe(false);
	});
});
