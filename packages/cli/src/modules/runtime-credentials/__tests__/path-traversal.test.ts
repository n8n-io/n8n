import type { IDataObject } from 'n8n-workflow';

import { extractAndClear } from '../path-traversal';

type Case = {
	name: string;
	input: IDataObject;
	path: string;
	expectedReturn: IDataObject[string] | undefined;
	expectedAfter: IDataObject;
};

const cases: Case[] = [
	// ── Simple dot path ──
	{
		name: 'single segment extracts top-level leaf',
		input: { a: 1, b: 2 },
		path: 'a',
		expectedReturn: 1,
		expectedAfter: { a: undefined, b: 2 },
	},
	{
		name: 'two-segment path extracts nested leaf',
		input: { a: { b: 'x' }, c: 9 },
		path: 'a.b',
		expectedReturn: 'x',
		expectedAfter: { a: { b: undefined }, c: 9 },
	},

	// ── Array wildcard [*] ──
	{
		name: '[*] last segment over multi-element array returns array of values',
		input: { tags: ['x', 'y', 'z'] },
		path: 'tags[*]',
		expectedReturn: ['x', 'y', 'z'],
		expectedAfter: { tags: [undefined, undefined, undefined] },
	},
	{
		name: '[*] mid-path collects leaf from each element',
		input: { items: [{ v: 1 }, { v: 2 }, { v: 3 }] },
		path: 'items[*].v',
		expectedReturn: [1, 2, 3],
		expectedAfter: { items: [{ v: undefined }, { v: undefined }, { v: undefined }] },
	},
	{
		name: '[*] over single-element array returns bare value (unwrapped)',
		input: { items: [{ v: 42 }] },
		path: 'items[*].v',
		expectedReturn: 42,
		expectedAfter: { items: [{ v: undefined }] },
	},
	{
		name: '[*] over empty array returns undefined (zero matches)',
		input: { items: [] },
		path: 'items[*].v',
		expectedReturn: undefined,
		expectedAfter: { items: [] },
	},
	{
		name: 'nested [*] segments collect all leaves depth-first',
		input: { groups: [{ items: [{ v: 1 }, { v: 2 }] }, { items: [{ v: 3 }] }] },
		path: 'groups[*].items[*].v',
		expectedReturn: [1, 2, 3],
		expectedAfter: {
			groups: [{ items: [{ v: undefined }, { v: undefined }] }, { items: [{ v: undefined }] }],
		},
	},
	{
		name: 'partial match in [*] branch — only present leaves collected',
		input: { items: [{ v: 1 }, { other: 2 }, { v: 3 }] },
		path: 'items[*].v',
		expectedReturn: [1, 3],
		expectedAfter: { items: [{ v: undefined }, { other: 2 }, { v: undefined }] },
	},

	// ── No-match / silent failures ──
	{
		name: 'missing intermediate key is silent no-op',
		input: { a: { b: 1 } },
		path: 'a.x.y',
		expectedReturn: undefined,
		expectedAfter: { a: { b: 1 } },
	},
	{
		name: '[*] on non-array value is silent no-op',
		input: { tags: 'not-an-array' },
		path: 'tags[*]',
		expectedReturn: undefined,
		expectedAfter: { tags: 'not-an-array' },
	},
	{
		name: 'descending through a primitive is silent no-op',
		input: { a: 5 },
		path: 'a.b',
		expectedReturn: undefined,
		expectedAfter: { a: 5 },
	},
	{
		name: 'descending through null is silent no-op',
		input: { a: null },
		path: 'a.b',
		expectedReturn: undefined,
		expectedAfter: { a: null },
	},

	// ── Mutation correctness / leaf shapes ──
	{
		name: 'sibling keys untouched after extraction',
		input: { a: { b: 1, keep: 'me' }, other: [1, 2] },
		path: 'a.b',
		expectedReturn: 1,
		expectedAfter: { a: { b: undefined, keep: 'me' }, other: [1, 2] },
	},
	{
		name: 'leaf value that is null is returned as null',
		input: { a: null },
		path: 'a',
		expectedReturn: null,
		expectedAfter: { a: undefined },
	},
	{
		name: 'leaf value that is an object is returned by reference',
		input: { a: { nested: { deep: 1 } } },
		path: 'a',
		expectedReturn: { nested: { deep: 1 } },
		expectedAfter: { a: undefined },
	},
	{
		name: 'leaf value that is an array is returned as-is (not iterated)',
		input: { a: [1, 2, 3] },
		path: 'a',
		expectedReturn: [1, 2, 3],
		expectedAfter: { a: undefined },
	},
];

describe('extractAndClear', () => {
	it.each(cases)('$name', ({ input, path, expectedReturn, expectedAfter }) => {
		const result = extractAndClear(input, path);
		expect(result).toEqual(expectedReturn);
		expect(input).toEqual(expectedAfter);
	});

	it('preserves the matched key (assignment, not delete)', () => {
		const obj: IDataObject = { a: 'gone' };
		extractAndClear(obj, 'a');
		expect('a' in obj).toBe(true);
		expect(obj.a).toBeUndefined();
	});

	it('preserves array length when clearing elements via [*]', () => {
		const obj: IDataObject = { tags: ['x', 'y', 'z'] };
		extractAndClear(obj, 'tags[*]');
		expect((obj.tags as unknown[]).length).toBe(3);
	});
});
