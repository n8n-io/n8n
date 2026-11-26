import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { RuntimeBridge } from '../../types';
import { DEFAULT_BRIDGE_CONFIG } from '../../types';
import { BATCH_READ_LIMITS } from '../batch-read';
import { HostDataResolver } from '../host-data-resolver';
import { IsolatedVmBridge } from '../isolated-vm-bridge';
import { QuickJsBridge } from '../quickjs-bridge';

type Json = Record<string, unknown>;

const rowOf = (index: number): Json => ({
	id: index,
	name: `row ${index}`,
	score: index * 1.5,
	active: index % 2 === 0,
	tags: ['a', `t${index}`],
	address: { city: `city ${index}`, geo: { lat: index, lng: -index - 1 } },
	note: index % 3 === 0 ? null : `note ${index}`,
});

const rowsOf = (count: number): Json[] => Array.from({ length: count }, (_, index) => rowOf(index));

/** Item data of many forms. Each one has a `rows` array. */
const items: Array<{ label: string; $json: () => Json }> = [
	{ label: 'no rows', $json: () => ({ id: 1, rows: [] }) },
	{ label: 'one row', $json: () => ({ id: 1, rows: rowsOf(1) }) },
	{ label: 'rows of small objects', $json: () => ({ id: 1, name: 'item', rows: rowsOf(120) }) },
	{
		label: 'rows over the small size',
		$json: () => ({
			id: 1,
			rows: rowsOf(40).map((row) => ({ ...row, text: 'x'.repeat(3000), list: rowsOf(30) })),
		}),
	},
	{
		label: 'a large field before the small fields',
		$json: () => ({
			text: 'x'.repeat(3000),
			id: 1,
			rows: rowsOf(20).map((row) => ({ text: 'x'.repeat(3000), ...row })),
		}),
	},
	{
		label: 'rows over the read limit',
		$json: () => ({
			id: 1,
			rows: rowsOf(3).map((row) => ({ ...row, text: 'x'.repeat(300_000) })),
		}),
	},
	{
		label: 'rows with different fields',
		$json: () => ({
			id: 1,
			rows: rowsOf(60).map((row, index) =>
				index % 3 === 0 ? row : index % 3 === 1 ? { id: index, other: [index] } : { name: 'n' },
			),
		}),
	},
	{
		label: 'rows of mixed types',
		$json: () => ({
			id: 1,
			rows: [rowOf(0), 1, 'text', null, [rowOf(1), 2], rowOf(2), true, rowOf(3), { id: 9 }],
		}),
	},
	{
		label: 'rows with values that JSON cannot carry',
		$json: () => ({
			id: 1,
			rows: rowsOf(30).map((row, index) => ({
				...row,
				at: new Date(index * 1000),
				gone: undefined,
				nan: Number.NaN,
			})),
		}),
	},
	{
		label: 'rows with keys of the transfer format',
		$json: () => ({
			id: 1,
			rows: rowsOf(20).map((row, index) => ({
				...row,
				__isDate: index,
				__isObject: true,
				__keys: ['x'],
				__n8nType: 'HostData',
				__value: index,
				text: '__isDate',
			})),
		}),
	},
	{
		label: 'rows with a __proto__ key',
		$json: () => ({
			id: 1,
			rows: Array.from(
				{ length: 20 },
				(_, index) => JSON.parse(`{"__proto__": {"a": ${index}}, "id": ${index}}`) as Json,
			),
		}),
	},
	{
		label: 'rows of pairs with a large value',
		$json: () => ({
			id: 1,
			rows: Array.from({ length: 40 }, (_, index) => [
				`key ${index}`,
				{ ...rowOf(index), text: 'x'.repeat(3000) },
			]),
		}),
	},
	{
		label: 'rows of number arrays',
		$json: () => ({
			id: 1,
			rows: Array.from({ length: 30 }, (_, index) =>
				Array.from({ length: 50 }, (_item, column) => index * column),
			),
		}),
	},
	{
		label: 'rows of long number arrays',
		$json: () => ({
			id: 1,
			rows: Array.from({ length: 12 }, (_, index) =>
				Array.from({ length: 300 }, (_item, column) => index * column),
			),
		}),
	},
	{
		label: 'rows that read as other values through a proxy',
		$json: () => ({
			id: 1,
			rows: rowsOf(30).map(
				(row) =>
					new Proxy(row, {
						get: (target, key, receiver) =>
							key === 'name' ? 'other name' : (Reflect.get(target, key, receiver) as unknown),
					}),
			),
		}),
	},
	{ label: 'numbers', $json: () => ({ id: 1, rows: Array.from({ length: 700 }, (_, i) => i) }) },
	{
		label: 'long strings',
		$json: () => ({ id: 1, rows: Array.from({ length: 12 }, (_, i) => String(i).repeat(5000)) }),
	},
	{
		label: 'a wide object',
		$json: () => ({
			id: 1,
			rows: rowsOf(3),
			...Object.fromEntries(Array.from({ length: 400 }, (_, index) => [`key${index}`, index])),
		}),
	},
	{
		label: 'deep data',
		$json: () => {
			const tree = (depth: number): Json =>
				depth === 0 ? { leaf: 'x'.repeat(40) } : { a: tree(depth - 1), b: tree(depth - 1) };
			return { id: 1, rows: [tree(7), tree(2)], tree: tree(8) };
		},
	},
];

/** Expressions that read item data in many ways. `$json` is the item. */
const expressions: Array<{ label: string; code: string }> = [
	{ label: 'returns the item', code: 'return $json;' },
	{ label: 'makes JSON text of the item', code: 'return JSON.stringify($json);' },
	{ label: 'reads one field', code: 'return $json.id;' },
	{ label: 'lists the keys', code: 'return Object.keys($json);' },
	{ label: 'lists the entries', code: 'return Object.entries($json).length;' },
	{ label: 'copies the item', code: 'return Object.assign({ extra: 1 }, $json);' },
	{ label: 'returns the first row', code: 'return $json.rows[0];' },
	{ label: 'returns the last row', code: 'return $json.rows[$json.rows.length - 1];' },
	{ label: 'returns five rows', code: 'return $json.rows.slice(2, 7);' },
	{ label: 'maps one field', code: 'return $json.rows.map(function (r) { return r && r.id; });' },
	{
		label: 'maps two fields',
		code: 'return $json.rows.map(function (r) { return r && [r.name, r.id, r.nope]; });',
	},
	{
		label: 'maps a nested field',
		code: 'return $json.rows.map(function (r) { return r && r.address && r.address.geo.lat; });',
	},
	{
		label: 'maps each row to JSON text',
		code: 'return $json.rows.map(function (r) { return JSON.stringify(r); });',
	},
	{
		label: 'maps each row to its keys',
		code: 'return $json.rows.map(function (r) { return r && typeof r === "object" ? Object.keys(r) : r; });',
	},
	{
		label: 'lists the keys of each row, then reads one field',
		code: 'return $json.rows.filter(function (r) { return r !== null && typeof r === "object" && Object.keys(r).length > 0; }).map(function (r) { return r.id; });',
	},
	{
		label: 'checks a key of each row',
		code: 'return $json.rows.map(function (r) { return r !== null && typeof r === "object" && [r.id, "name" in r, "nope" in r]; });',
	},
	{
		label: 'filters by a field and returns the rows',
		code: 'return $json.rows.filter(function (r) { return r && r.id % 2 === 0; });',
	},
	{
		label: 'finds a row',
		code: 'return $json.rows.find(function (r) { return r && r.id === 2; });',
	},
	{
		label: 'reads the rows from the last one',
		code: 'var out = []; for (var i = $json.rows.length - 1; i >= 0; i--) { out.push($json.rows[i] && $json.rows[i].id); } return out;',
	},
	{
		label: 'reads every second row',
		code: 'var out = []; for (var i = 0; i < $json.rows.length; i += 2) { out.push($json.rows[i]); } return out;',
	},
	{
		label: 'reads a field, then each whole row',
		code: 'return $json.rows.map(function (r, i) { return i < 3 ? r && r.id : r; });',
	},
	{
		label: 'reads each whole row, then a field',
		code: 'return $json.rows.map(function (r, i) { return i < 3 ? JSON.stringify(r) : r && r.id; });',
	},
	{ label: 'joins the rows', code: 'return $json.rows.join("|").length;' },
	{ label: 'copies the rows', code: 'return [].concat($json.rows).reverse();' },
	{
		label: 'adds a row',
		code: '$json.rows.push({ id: -1 }); return [$json.rows.length, $json.rows];',
	},
	{
		label: 'changes a field of the item',
		code: '$json.id = 2; delete $json.name; return $json;',
	},
	{
		label: 'changes a field of each row after a read by name',
		code: 'return $json.rows.map(function (r) { if (r && typeof r === "object" && r.id !== undefined) { r.id = "changed"; delete r.name; } return r; });',
	},
	{
		label: 'lists the keys of the item after a change',
		code: '$json.added = 1; return [Object.keys($json), JSON.stringify($json)];',
	},
	{
		label: 'lists the keys of each row after a change',
		code: 'return $json.rows.map(function (r) { if (r === null || typeof r !== "object") { return r; } r.added = 1; return [Object.keys(r), JSON.stringify(r)]; });',
	},
	{
		label: 'reads two items of each row',
		code: 'return $json.rows.map(function (r) { return r !== null && typeof r === "object" ? [r[0], r[1]] : r; });',
	},
	{
		label: 'reads two items of the first row, then each whole row',
		code: 'var first = $json.rows[0]; var head = first !== null && typeof first === "object" ? [first[0], first[1]] : first; return [head, $json.rows.map(function (r) { return r; })];',
	},
	{
		label: 'reads the same row two times',
		code: 'var r = $json.rows; return [r[1], r[1], r[2] === r[2], r.length];',
	},
];

/** Runs the code as plain JavaScript. */
function evaluatePlain(code: string, $json: Json): unknown {
	// eslint-disable-next-line @typescript-eslint/no-implied-eval -- the code is a fixed test expression
	return new Function('$json', code)($json);
}

const bridges: Array<{ label: string; create: () => RuntimeBridge }> = [
	{ label: 'QuickJsBridge', create: () => new QuickJsBridge({ timeout: 30_000 }) },
	{ label: 'IsolatedVmBridge', create: () => new IsolatedVmBridge({ timeout: 30_000 }) },
];

describe.each(bridges)('$label item data', ({ create }) => {
	let bridge: RuntimeBridge;

	beforeAll(async () => {
		bridge = create();
		await bridge.initialize();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await bridge.dispose();
	});

	function evaluate(code: string, $json: unknown): unknown {
		return bridge.execute(`var $json = this.$json; ${code}`, { $json } as never);
	}

	function countHostReads(): () => number {
		const resolve = vi.spyOn(HostDataResolver.prototype, 'resolve');
		return () => resolve.mock.calls.length;
	}

	describe.each(items)('with $label', ({ $json }) => {
		it.each(expressions)('$label as plain JavaScript does', ({ code }) => {
			const expected = evaluatePlain(code, $json());
			const data = $json();

			expect(evaluate(code, data)).toStrictEqual(expected);
			// The host data never changes.
			expect(data).toStrictEqual($json());
		});
	});

	it('reads the rows of a large item in a few host reads', () => {
		const $json = { id: 1, rows: rowsOf(2000) };
		const hostReads = countHostReads();

		expect(evaluate('return JSON.stringify($json);', $json)).toBe(JSON.stringify($json));
		expect(hostReads()).toBeLessThan(30);
	});

	it('reads one field of each row in a few host reads', () => {
		const $json = { id: 1, rows: rowsOf(2000) };
		const hostReads = countHostReads();

		expect(evaluate('return $json.rows.map(function (r) { return r.name; });', $json)).toEqual(
			$json.rows.map((row) => row.name),
		);
		expect(hostReads()).toBeLessThan(15);
	});

	it('reads the fields of a wide object in one host read', () => {
		const $json = Object.fromEntries(Array.from({ length: 3000 }, (_, i) => [`key${i}`, i]));
		const hostReads = countHostReads();

		expect(evaluate('return Object.values($json).length;', $json)).toBe(3000);
		// One read for the item and one for its fields.
		expect(hostReads()).toBe(2);
	});

	it('reads a long array of numbers in a few host reads', () => {
		const $json = { rows: Array.from({ length: 20_000 }, (_, index) => index) };
		const hostReads = countHostReads();

		expect(evaluate('return $json.rows.reduce(function (a, b) { return a + b; }, 0);', $json)).toBe(
			199_990_000,
		);
		expect(hostReads()).toBeLessThan(15);
	});

	it('does not read the rows for one field of the item', () => {
		const $json = { id: 7, rows: rowsOf(2000) };
		const hostReads = countHostReads();

		expect(evaluate('return $json.id;', $json)).toBe(7);
		// One read for the item and one for the field.
		expect(hostReads()).toBe(2);
	});

	it('reads only the first rows when the expression stops early', () => {
		let lastRowRead = -1;
		const rows = new Proxy(rowsOf(5000), {
			get: (target, key, receiver) => {
				if (typeof key === 'string' && /^\d+$/.test(key)) {
					lastRowRead = Math.max(lastRowRead, Number(key));
				}
				return Reflect.get(target, key, receiver) as unknown;
			},
		});
		const hostReads = countHostReads();

		expect(
			evaluate('return $json.rows.find(function (r) { return r.id === 3; }).name;', { rows }),
		).toBe('row 3');
		expect(hostReads()).toBeLessThan(10);
		expect(lastRowRead).toBeLessThan(100);
	});

	it('reads a field with a name over the small size by name', () => {
		const name = 'n'.repeat(BATCH_READ_LIMITS.smallValueChars + 1);
		const $json = { rows: rowsOf(20).map((row) => ({ ...row, [name]: row.id })) };
		const code = `return $json.rows.map(function (r) { return r.${name}; });`;

		expect(evaluate(code, $json)).toStrictEqual(evaluatePlain(code, $json));
	});

	it('never calls a getter of the item data more than a read of one field does', () => {
		const read = vi.fn(() => 'computed');
		const rows = rowsOf(10).map((row) =>
			Object.defineProperty(row, 'lazy', { get: read, enumerable: true }),
		);

		expect(evaluate('return $json.rows.map(function (r) { return r.id; });', { rows })).toEqual(
			rows.map((row) => row.id),
		);
		expect(read).not.toHaveBeenCalled();
	});

	it('reads one value for each host call after the batched reads spend the budget of the evaluation', () => {
		const $json = { rows: rowsOf(100) };
		const code = 'return $json.rows.map(function (r) { return r.id; });';
		const bytesPerChar = BATCH_READ_LIMITS.memoryBytesPerChar;
		// A budget of one character.
		BATCH_READ_LIMITS.memoryBytesPerChar = DEFAULT_BRIDGE_CONFIG.memoryLimit * 1024 * 1024;
		try {
			const hostReads = countHostReads();

			expect(evaluate(code, $json)).toStrictEqual(evaluatePlain(code, $json));
			// The first batched read spends the budget. Each next row takes two host reads.
			expect(hostReads()).toBeGreaterThan(100);
		} finally {
			BATCH_READ_LIMITS.memoryBytesPerChar = bytesPerChar;
		}
	});

	it('throws the error of a host read in a batched read', () => {
		const rows = [
			{ id: 0 },
			new Proxy(
				{ id: 1 },
				{
					getPrototypeOf() {
						throw new Error('trap');
					},
				},
			),
		];

		expect(() =>
			evaluate('return $json.rows.map(function (r) { return r.id; });', { rows }),
		).toThrow('trap');
	});

	it('reads an item of another node one field at a time', () => {
		const rows = rowsOf(50);
		const data = { $json: {}, $other: { rows } };
		const hostReads = countHostReads();

		expect(
			bridge.execute('return JSON.stringify(this.$other.rows[1]) + this.$other.rows.length;', data),
		).toBe(JSON.stringify(rows[1]) + '50');
		expect(hostReads()).toBeGreaterThan(10);
	});
});
