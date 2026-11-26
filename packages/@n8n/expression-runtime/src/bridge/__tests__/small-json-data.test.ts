import { describe, expect, it, vi } from 'vitest';

import { smallJsonCopy } from '../small-json-data';

const charsOf = (value: unknown, maxChars: number) => {
	const result = smallJsonCopy(value, maxChars);
	return result.copy === undefined ? undefined : result.chars;
};

const isSmall = (value: unknown, maxChars: number) => charsOf(value, maxChars) !== undefined;

describe('smallJsonCopy, for an object or an array', () => {
	it.each([
		{ label: 'an object of JSON values', value: { a: 1, b: 'text', c: null, d: true, e: [] } },
		{ label: 'an array of objects', value: [{ id: 1 }, { id: 2, tags: ['a'] }] },
		{ label: 'an empty object', value: {} },
		{ label: 'an object without a prototype', value: Object.assign(Object.create(null), { a: 1 }) },
		{ label: 'a __proto__ data key', value: JSON.parse('{"__proto__": {"a": 1}}') as unknown },
	])('accepts $label', ({ value }) => {
		expect(isSmall(value, 1000)).toBe(true);
	});

	it.each([
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
		{
			label: 'an array with an index that is not enumerable',
			value: Object.defineProperty([1, 2], 1, { enumerable: false }),
		},
		{ label: 'a symbol key', value: { a: 1, [Symbol('s')]: 2 } },
		{ label: 'a transfer type key', value: { a: { __n8nType: 'HostData' } } },
		{ label: 'an error flag key', value: { __isError: true } },
	])('rejects $label', ({ value }) => {
		expect(isSmall(value, 1000)).toBe(false);
	});

	it('rejects an accessor without calling it', () => {
		const read = vi.fn(() => 1);
		const value = Object.defineProperty({}, 'count', { get: read, enumerable: true });

		expect(isSmall(value, 1000)).toBe(false);
		expect(read).not.toHaveBeenCalled();
	});

	it('rejects data that refers to itself', () => {
		const value: Record<string, unknown> = { a: 1 };
		value.self = value;

		expect(isSmall(value, 1_000_000)).toBe(false);
	});

	it('accepts 16 levels of arrays and rejects 17', () => {
		const arrayOfLevels = (levels: number) =>
			Array.from({ length: levels - 1 }).reduce<unknown[]>((inner) => [inner], []);

		expect(isSmall(arrayOfLevels(16), 1000)).toBe(true);
		expect(isSmall(arrayOfLevels(17), 1000)).toBe(false);
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

		expect(isSmall(value, 1000)).toBe(false);
	});

	it('counts the characters of a string', () => {
		const value = { text: 'x'.repeat(100) };

		expect(isSmall(value, 200)).toBe(true);
		expect(isSmall(value, 100)).toBe(false);
	});

	it('counts each value that is not a string', () => {
		// The keys take 290 characters. The limit of 500 is passed only when the values count.
		const value = Object.fromEntries(
			Array.from({ length: 100 }, (_, index) => [`f${index}`, index]),
		);

		expect(isSmall(value, 10_000)).toBe(true);
		expect(isSmall(value, 500)).toBe(false);
	});

	it.each([0, -1])('rejects all data for a limit of %d', (maxChars) => {
		expect(isSmall({}, maxChars)).toBe(false);
	});
});

describe('smallJsonCopy', () => {
	it('counts what a walk counted before it stopped, at most the limit', () => {
		expect(smallJsonCopy(new Date(0), 100)).toEqual({ copy: undefined, chars: 8 });
		expect(smallJsonCopy({ a: 1, b: undefined }, 100)).toEqual({ copy: undefined, chars: 18 });
		expect(smallJsonCopy('x'.repeat(200), 100)).toEqual({ copy: undefined, chars: 100 });
	});

	it.each([
		{ label: 'null', value: null, chars: 8 },
		{ label: 'a boolean', value: true, chars: 8 },
		{ label: 'a number', value: 42, chars: 8 },
		{ label: 'a string', value: 'text', chars: 12 },
		{ label: 'an empty object', value: {}, chars: 8 },
		{ label: 'an object', value: { id: 1, name: 'ab' }, chars: 32 },
		{ label: 'an array', value: [1, 'ab'], chars: 26 },
	])('counts $chars characters for $label', ({ value, chars }) => {
		expect(charsOf(value, 1000)).toBe(chars);
		expect(charsOf(value, chars)).toBe(chars);
		expect(charsOf(value, chars - 1)).toBeUndefined();
	});

	it.each([
		{ label: 'undefined', value: undefined },
		{ label: 'NaN', value: Number.NaN },
		{ label: 'a negative zero', value: -0 },
		{ label: 'a function', value: () => 1 },
		{ label: 'a Date', value: new Date(0) },
		{ label: 'an object with a framing key', value: { __n8nType: 'x' } },
	])('gives undefined for $label', ({ value }) => {
		expect(charsOf(value, 1000)).toBeUndefined();
	});

	it('gives a copy that shares no object with the data', () => {
		const value = { rows: [{ id: 1 }], meta: { total: 1 } };

		const copy = smallJsonCopy(value, 1000).copy as typeof value;

		expect(copy).toEqual(value);
		expect(copy).not.toBe(value);
		expect(copy.rows).not.toBe(value.rows);
		expect(copy.rows[0]).not.toBe(value.rows[0]);
	});

	it('copies a key that the object prototype also has as an own field', () => {
		const value = JSON.parse(
			'{"__proto__": {"a": 1}, "toString": "text", "constructor": 2}',
		) as object;

		const copy = smallJsonCopy(value, 1000).copy as object;

		expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
		expect(Object.entries(copy)).toEqual(Object.entries(value));
	});

	it('copies what each key of a proxy reads as', () => {
		const value = new Proxy<Record<string, unknown>>(
			{ id: 1 },
			{ get: (target, key) => (key === 'id' ? 22 : Reflect.get(target, key)) },
		);

		expect(smallJsonCopy(value, 1000).copy).toEqual({ id: 22 });
	});
});
