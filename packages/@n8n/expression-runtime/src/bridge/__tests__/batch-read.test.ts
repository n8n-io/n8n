import { describe, expect, it, vi } from 'vitest';

import { SMALL_VALUES, WHOLE_VALUES } from '../../runtime/lazy-proxy';
import type { BatchRequest } from '../../runtime/lazy-proxy';
import { BATCH_READ_LIMITS, batchReadBudget, readBatchAtPath } from '../batch-read';
import type { BatchReadBudget } from '../batch-read';
import { HostDataResolver } from '../host-data-resolver';
import { getValueAtPath } from '../host-functions';

const limits = {
	smallValueChars: 100,
	firstBatchChars: 60,
	maxBatchChars: 1000,
	memoryBytesPerChar: 2,
};

const whole = (value: unknown) => ({ __n8nType: 'HostData', __value: value });

function readItems(
	rows: unknown,
	start: number,
	step: number,
	request: BatchRequest,
	budget: BatchReadBudget = { remaining: 100_000 },
) {
	return readBatchAtPath(
		new HostDataResolver({ $json: { rows } }),
		['$json', 'rows'],
		start,
		step,
		request,
		limits,
		budget,
	);
}

function readFields(
	$json: unknown,
	request: BatchRequest = SMALL_VALUES,
	budget: BatchReadBudget = { remaining: 100_000 },
) {
	return readBatchAtPath(new HostDataResolver({ $json }), ['$json'], 0, 0, request, limits, budget);
}

describe('readBatchAtPath on an array', () => {
	const numbers = Array.from({ length: 100 }, (_, index) => index);

	it('returns the run of items from the start index', () => {
		// A number counts for 8 characters, and the first read takes 60.
		expect(readItems(numbers, 5, 0, SMALL_VALUES)).toEqual(whole(numbers.slice(5, 12)));
	});

	it('grows the read four times at each step', () => {
		expect(readItems(numbers, 0, 1, SMALL_VALUES)).toEqual(whole(numbers.slice(0, 30)));
	});

	it('takes at most the read limit', () => {
		expect(
			readItems(
				Array.from({ length: 500 }, () => 1),
				0,
				9,
				SMALL_VALUES,
			),
		).toEqual(whole(Array.from({ length: 125 }, () => 1)));
	});

	it('stops at the end of the array', () => {
		expect(readItems([1, 2, 3], 1, 0, SMALL_VALUES)).toEqual(whole([2, 3]));
	});

	it('returns undefined for a start index after the last item', () => {
		expect(readItems([1, 2, 3], 3, 0, SMALL_VALUES)).toBeUndefined();
	});

	it.each([-1, 1.5, Number.NaN])('returns undefined for the start index %s', (start) => {
		expect(readItems([1, 2, 3], start, 0, SMALL_VALUES)).toBeUndefined();
	});

	it('returns small objects whole', () => {
		const rows = [{ id: 1 }, { id: 2, tags: ['a'] }];

		expect(readItems(rows, 0, 0, SMALL_VALUES)).toEqual(whole(rows));
	});

	it('stops the run before an item that is over the small size', () => {
		const rows = [{ id: 1 }, { text: 'x'.repeat(200) }, { id: 3 }];

		expect(readItems(rows, 0, 0, SMALL_VALUES)).toEqual(whole([{ id: 1 }]));
	});

	it('describes the item at the start index when it is over the small size', () => {
		const rows = [{ text: 'x'.repeat(200) }];

		expect(readItems(rows, 0, 0, SMALL_VALUES)).toEqual({ __isObject: true, __keys: ['text'] });
	});

	it('describes the item at the start index when it is over the small size of the bridges', () => {
		expect(
			readBatchAtPath(
				new HostDataResolver({ $json: { rows: [{ text: 'x'.repeat(2000) }] } }),
				['$json', 'rows'],
				0,
				0,
				SMALL_VALUES,
				BATCH_READ_LIMITS,
				batchReadBudget(128, BATCH_READ_LIMITS),
			),
		).toEqual({ __isObject: true, __keys: ['text'] });
	});

	it('returns a long string at the start index as it is', () => {
		const text = 'x'.repeat(200);

		expect(readItems([text, 'short'], 0, 0, SMALL_VALUES)).toBe(text);
	});

	it('returns an item over the small size whole for a request of whole values', () => {
		const rows = [{ text: 'x'.repeat(200) }, { text: 'y'.repeat(200) }];

		// The first item can take the read limit. The first read has no room for the second.
		expect(readItems(rows, 0, 0, WHOLE_VALUES)).toEqual(whole([rows[0]]));
		expect(readItems(rows, 0, 2, WHOLE_VALUES)).toEqual(whole(rows));
	});

	it('describes an item over the read limit for a request of whole values', () => {
		const rows = [{ text: 'x'.repeat(2000) }];

		expect(readItems(rows, 0, 0, WHOLE_VALUES)).toEqual({ __isObject: true, __keys: ['text'] });
	});

	it.each([
		{ label: 'a Date', item: { at: new Date(0) } },
		{ label: 'undefined', item: { a: undefined } },
		{ label: 'NaN', item: { n: Number.NaN } },
		{ label: 'a framing key', item: { __n8nType: 'HostData' } },
	])('describes an item that holds $label', ({ item }) => {
		expect(readItems([item], 0, 0, WHOLE_VALUES)).toEqual({
			__isObject: true,
			__keys: Object.keys(item),
		});
	});

	it('returns a hole as undefined', () => {
		const rows = [1, , 3];

		expect(readItems(rows, 0, 0, SMALL_VALUES)).toEqual(whole([1]));
		expect(readItems(rows, 1, 0, SMALL_VALUES)).toBeUndefined();
	});

	it('stops at an accessor', () => {
		const read = vi.fn(() => 1);
		const rows = [1];
		Object.defineProperty(rows, 1, { get: read, enumerable: true });

		expect(readItems(rows, 0, 0, SMALL_VALUES)).toEqual(whole([1]));
		expect(read).not.toHaveBeenCalled();
	});

	it('gives one lazy item for an array subclass', () => {
		class Rows extends Array<number> {}

		expect(readItems(Rows.from([1, 2]), 0, 0, SMALL_VALUES)).toBe(1);
	});

	it('throws the error of a proxy trap, as a read of one item does', () => {
		const item = new Proxy(
			{},
			{
				getPrototypeOf() {
					throw new Error('trap');
				},
			},
		);

		expect(() => readItems([item], 0, 0, ['id'])).toThrow('trap');
	});

	it('gives one lazy item for a path outside $json', () => {
		const resolver = new HostDataResolver({ $json: {}, $other: { rows: [1, 2] } });

		expect(
			readBatchAtPath(resolver, ['$other', 'rows'], 0, 0, SMALL_VALUES, limits, { remaining: 1 }),
		).toBe(1);
	});
});

describe('readBatchAtPath on an array, for a request of named fields', () => {
	const rows = Array.from({ length: 20 }, (_, index) => ({
		id: index,
		name: `row ${index}`,
		big: 'x'.repeat(200),
		nested: { a: index },
	}));

	it('returns only the named fields of each item', () => {
		// An item counts for 8 characters, the name for 2 and a number for 8. The first read takes 60.
		expect(readItems(rows, 2, 0, ['id'])).toEqual(whole([{ id: 2 }, { id: 3 }, { id: 4 }]));
	});

	it('returns a small object field whole', () => {
		// Each item takes 31 characters, so the first read of 60 has room for one.
		expect(readItems(rows, 0, 0, ['nested'])).toEqual(whole([{ nested: { a: 0 } }]));
	});

	it('leaves out a field that is missing or over the small size', () => {
		expect(readItems(rows.slice(0, 1), 0, 0, ['id', 'big', 'nope'])).toEqual(whole([{ id: 0 }]));
	});

	it('leaves out a field that only the prototype has', () => {
		expect(readItems([{ id: 1 }], 0, 0, ['toString', 'constructor', '__proto__'])).toEqual(
			whole([{}]),
		);
	});

	it('keeps an own __proto__ key as data', () => {
		const item = JSON.parse('{"__proto__": 1}') as object;
		const result = readItems([item], 0, 0, ['__proto__']) as { __value: object[] };

		expect(Object.getOwnPropertyDescriptor(result.__value[0], '__proto__')?.value).toBe(1);
	});

	it('leaves out a framing key', () => {
		expect(readItems([{ __n8nType: 'x', id: 1 }], 0, 0, ['__n8nType', 'id'])).toEqual(
			whole([{ id: 1 }]),
		);
	});

	it('never calls an accessor', () => {
		const read = vi.fn(() => 1);
		const item = Object.defineProperty({ id: 1 }, 'computed', { get: read, enumerable: true });

		expect(readItems([item], 0, 0, ['id', 'computed'])).toEqual(whole([{ id: 1 }]));
		const rows = [{ id: 1 }];
		Object.defineProperty(rows, 1, { get: read, enumerable: true });
		expect(readItems(rows, 0, 0, ['id'])).toEqual(whole([{ id: 1 }]));
		expect(read).not.toHaveBeenCalled();
	});

	it('stops the run before an item whose fields go over what is left of the read', () => {
		const long = { id: 2, text: 'x'.repeat(50) };
		const items = [{ id: 1 }, long, { id: 3 }];

		expect(readItems(items, 0, 0, ['id', 'text'])).toEqual(whole([{ id: 1 }]));
		expect(readItems(items, 1, 0, ['id', 'text'])).toEqual(whole([long]));
	});

	it('stops the run before an item that is not a plain object', () => {
		expect(readItems([{ id: 1 }, [2], { id: 3 }], 0, 0, ['id'])).toEqual(whole([{ id: 1 }]));
	});

	it('counts the name of each field in the read limit', () => {
		const name = 'n'.repeat(92);
		const items = Array.from({ length: 10 }, () => ({ [name]: 1 }));

		// Each item takes 108 characters of the read limit of 1000.
		expect(readItems(items, 0, 9, [name])).toEqual(whole(items.slice(0, 9)));
	});

	it('leaves a name over the small size out of the request, so its field is read alone', () => {
		const name = 'n'.repeat(limits.smallValueChars + 1);
		const rows = [{ [name]: 'value', id: 1 }];
		const resolver = new HostDataResolver({ $json: { rows } });
		const budget = { remaining: 1000 };

		expect(
			readBatchAtPath(resolver, ['$json', 'rows'], 0, 0, [name, 'id'], limits, budget),
		).toEqual(whole([{ id: 1 }]));
		// The item counts 8, the name `id` 2 and the number 8.
		expect(budget.remaining).toBe(1000 - 18);
		expect(getValueAtPath(resolver, ['$json', 'rows', '0', name])).toBe('value');
	});

	it('counts a field over the small size as the small size, and a missing field as nothing', () => {
		const items = Array.from({ length: 200 }, () => ({ meta: { text: 'x'.repeat(200) } }));

		// Each item takes 108 characters of the read limit of 1000.
		expect(readItems(items, 0, 9, ['meta', 'nope'])).toEqual(
			whole(Array.from({ length: 9 }, () => ({}))),
		);
	});

	it.each([
		{ label: 'a primitive', item: 5, lazy: 5 },
		{ label: 'an array', item: [1], lazy: { __isArray: true, __length: 1, __data: null } },
		{
			label: 'a class instance',
			item: new (class Row {})(),
			lazy: { __isObject: true, __keys: [] },
		},
	])('gives one lazy item when the item at the start index is $label', ({ item, lazy }) => {
		expect(readItems([item], 0, 0, ['id'])).toEqual(lazy);
	});

	it('ignores a name that is not a string, and names after the first 16', () => {
		const item = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`f${index}`, index]));
		const names = [1, ...Object.keys(item)] as unknown as string[];
		const result = readItems([item], 0, 0, names) as { __value: object[] };

		expect(Object.keys(result.__value[0])).toEqual(Object.keys(item).slice(0, 16));
	});
});

describe('readBatchAtPath on an object', () => {
	it('returns the small fields whole and leaves out the others', () => {
		const $json = {
			id: 1,
			name: 'a',
			flag: true,
			nothing: null,
			small: { a: [1, 2] },
			big: { text: 'x'.repeat(200) },
			long: 'y'.repeat(200),
			at: new Date(0),
			gone: undefined,
			call: () => 1,
		};

		expect(readFields($json)).toEqual(
			whole({ id: 1, name: 'a', flag: true, nothing: null, small: { a: [1, 2] } }),
		);
	});

	it('returns a field over the small size whole for a request of whole values', () => {
		const $json = { big: { text: 'x'.repeat(200) }, long: 'y'.repeat(200) };

		expect(readFields($json, WHOLE_VALUES)).toEqual(whole($json));
	});

	it('leaves out the fields that do not fit in the read limit', () => {
		const $json = { a: 'x'.repeat(600), b: 'y'.repeat(600), c: 1 };

		// The walk of `b` counts the rest of the read, so `c` gets no walk.
		expect(readFields($json, WHOLE_VALUES)).toEqual(whole({ a: $json.a }));
		expect(readFields({ ['a'.repeat(600)]: 1, ['b'.repeat(600)]: 2 }, WHOLE_VALUES)).toEqual(
			whole({ ['a'.repeat(600)]: 1 }),
		);
	});

	it('leaves out a framing key and keeps an own __proto__ key as data', () => {
		const $json = JSON.parse('{"__n8nType": "x", "__proto__": 1, "id": 2}') as object;
		const result = readFields($json) as { __value: object };

		expect(Object.keys(result.__value)).toEqual(['__proto__', 'id']);
		expect(Object.getOwnPropertyDescriptor(result.__value, '__proto__')?.value).toBe(1);
	});

	it('never calls an accessor', () => {
		const read = vi.fn(() => 1);
		const $json = Object.defineProperty({ id: 1 }, 'computed', { get: read, enumerable: true });

		expect(readFields($json)).toEqual(whole({ id: 1 }));
		expect(read).not.toHaveBeenCalled();
	});

	it.each([
		{ label: 'a class instance', $json: Object.assign(new (class Item {})(), { id: 1 }) },
		{ label: 'a Date', $json: new Date(0) },
		{ label: 'a primitive', $json: 5 },
		{ label: 'null', $json: null },
	])('returns no field for $label', ({ $json }) => {
		expect(readFields($json)).toEqual(whole({}));
	});

	it('returns no field when a proxy trap throws', () => {
		const $json = new Proxy(
			{ id: 1 },
			{
				ownKeys() {
					throw new Error('trap');
				},
			},
		);

		expect(readFields($json)).toEqual(whole({}));
	});

	it('returns no field for a path outside $json', () => {
		const resolver = new HostDataResolver({ $json: {}, $other: { id: 1 } });

		expect(
			readBatchAtPath(resolver, ['$other'], 0, 0, SMALL_VALUES, limits, { remaining: 1 }),
		).toEqual(whole({}));
	});
});

describe('readBatchAtPath with the character budget of an evaluation', () => {
	it('gives an evaluation half of the memory limit of the bridge in characters', () => {
		expect(batchReadBudget(128, BATCH_READ_LIMITS)).toEqual({ remaining: 67_108_864 });
		expect(batchReadBudget(32, BATCH_READ_LIMITS)).toEqual({ remaining: 16_777_216 });
	});

	it('gives one item, as a read of one item does, when the budget is spent', () => {
		expect(readItems([1, { id: 2 }], 0, 0, SMALL_VALUES, { remaining: 0 })).toBe(1);
		expect(readItems([1, { id: 2 }], 1, 0, ['id'], { remaining: 0 })).toEqual({
			__isObject: true,
			__keys: ['id'],
		});
	});

	it('gives no field when the budget is spent', () => {
		expect(readFields({ id: 1 }, SMALL_VALUES, { remaining: 0 })).toEqual(whole({}));
	});

	it.each([
		{
			label: 'array items',
			read: (budget: BatchReadBudget) => readItems([1, 2, 3], 0, 0, SMALL_VALUES, budget),
			chars: 24,
		},
		{
			label: 'every field',
			read: (budget: BatchReadBudget) => readFields({ id: 1, name: 'ab' }, SMALL_VALUES, budget),
			chars: 24,
		},
		{
			label: 'named fields, with a field over the small size',
			read: (budget: BatchReadBudget) =>
				readItems([{ id: 1, big: 'x'.repeat(200) }], 0, 0, ['id', 'big'], budget),
			chars: 118,
		},
		{
			label: 'array items, with a start item that does not go across',
			read: (budget: BatchReadBudget) =>
				readItems([{ nums: [1, 2, 3], at: new Date(0) }], 0, 0, WHOLE_VALUES, budget),
			// The object 8, `nums` 4 + 8 + 3 x 8, and `at` 2 + 8 until the walk stops at the Date.
			chars: 54,
		},
		{
			label: 'array items, with a later item that does not go across',
			read: (budget: BatchReadBudget) =>
				readItems([1, { at: new Date(0) }], 0, 0, SMALL_VALUES, budget),
			// The later item is the start of the next read, which counts it.
			chars: 8,
		},
	])('takes the characters of a read of $label from the budget', ({ read, chars }) => {
		const budget = { remaining: 1000 };

		read(budget);

		expect(budget.remaining).toBe(1000 - chars);
	});
});

describe('readBatchAtPath with a field that does not go across', () => {
	class Item {
		id = 1;
	}
	const wide = Object.fromEntries(
		Array.from({ length: 2000 }, (_, index) => [`key${index}`, index]),
	);

	it('charges a Date and a class instance what their walks counted', () => {
		const item = { at: new Date(0), obj: new Item() };
		const named = { remaining: 1000 };
		const fields = { remaining: 1000 };

		expect(readItems([item], 0, 0, ['at', 'obj'], named)).toEqual(whole([{}]));
		expect(readFields(item, WHOLE_VALUES, fields)).toEqual(whole({}));
		// The item counts 8. Each walk counts 8 for its value and stops.
		expect(1000 - named.remaining).toBe(8 + 8 + 8);
		// Each field also counts its key.
		expect(1000 - fields.remaining).toBe(2 + 8 + 3 + 8);
	});

	it('charges a wide field its whole limit and leaves out the fields after it', () => {
		const named = { remaining: 100_000 };
		const fields = { remaining: 100_000 };

		const result = readFields({ id: 1, name: 'a', meta: wide, after: 2 }, WHOLE_VALUES, fields);
		expect(result).toEqual(whole({ id: 1, name: 'a' }));
		expect(Object.keys((result as { __value: object }).__value)).toEqual(['id', 'name']);
		expect(100_000 - fields.remaining).toBe(limits.maxBatchChars);
		expect(readItems([{ meta: wide }], 0, 0, ['meta'], named)).toEqual(whole([{}]));
		expect(100_000 - named.remaining).toBe(8 + limits.smallValueChars);
	});
});

describe('readBatchAtPath on a host proxy that wraps its values', () => {
	/** A proxy that reads each object as another proxy, and reads `changes` in place of the data. */
	function wrapValues<T extends object>(data: T, changes: Record<string, unknown> = {}): T {
		return new Proxy(data, {
			get(target, key, receiver) {
				const value: unknown =
					typeof key === 'string' && Object.hasOwn(changes, key)
						? changes[key]
						: Reflect.get(target, key, receiver);
				return typeof value === 'object' && value !== null ? wrapValues(value) : value;
			},
		});
	}

	it('returns whole items as plain data', () => {
		const result = readItems(wrapValues([{ id: 1, tags: ['a'] }, { id: 2 }]), 0, 0, SMALL_VALUES);

		expect(result).toEqual(whole([{ id: 1, tags: ['a'] }, { id: 2 }]));
		expect(() => structuredClone(result)).not.toThrow();
	});

	it('returns the fields of an object as plain data', () => {
		const result = readFields(wrapValues({ a: { b: [1] }, n: 1 }));

		expect(result).toEqual(whole({ a: { b: [1] }, n: 1 }));
		expect(() => structuredClone(result)).not.toThrow();
	});

	it('returns the item that the proxy reads, not the item that the data holds', () => {
		const rows = wrapValues([{ id: 1 }, { id: 2 }], { 1: { id: 22 } });

		expect(readItems(rows, 0, 0, SMALL_VALUES)).toEqual(whole([{ id: 1 }, { id: 22 }]));
		expect(readItems(rows, 0, 0, ['id'])).toEqual(whole([{ id: 1 }, { id: 22 }]));
	});
});
