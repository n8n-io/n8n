import { describe, expect, it } from 'vitest';

import { jsonSizeExceeds } from './json-size-exceeds';

const ONE_MIB = 1024 * 1024;

/** Smallest limit, in bytes, at which `value` is reported as exceeding it. */
const smallestExceededLimit = (value: unknown) => {
	let exceeded = -1;
	let within = 1;
	while (jsonSizeExceeds(value, within)) {
		within *= 2;
	}
	while (within - exceeded > 1) {
		const middle = Math.floor((exceeded + within) / 2);
		if (jsonSizeExceeds(value, middle)) {
			exceeded = middle;
		} else {
			within = middle;
		}
	}

	return exceeded;
};

const realSize = (value: unknown) => Buffer.byteLength(JSON.stringify(value) ?? 'undefined');

describe('jsonSizeExceeds', () => {
	describe('never reports a size larger than the real one', () => {
		it.each<[string, unknown]>([
			['a string', 'hello'],
			['an empty string', ''],
			['a multi-byte string', 'pour sûr 😀'],
			['a multi-byte key', { ['clé 蟹']: 'valeur' }],
			['a string needing escapes', 'a"b\\c\nd'],
			['integers', [0, -0, 1, -1, 9, 10, 99, 100, 999999, 1000000]],
			['extreme magnitudes', [1e20, 1e21, 1e22, 1e-7, 5e-324, Number.MAX_SAFE_INTEGER]],
			['non-finite numbers', [NaN, Infinity, -Infinity]],
			['floats', [0.1, -0.5, 1.5, -1.25e-300, 1.2345678901234567]],
			['keywords', [true, false, null]],
			['an empty object', {}],
			['an empty array', []],
			['nested containers', { a: {}, b: [], c: { d: [1, { e: 'f' }] }, g: [[], [[]]] }],
			['entries serialization drops', { kept: 1, gone: undefined, alsoGone: () => 0 }],
			['an element serialization turns into null', [1, undefined, 2]],
			['a nested Buffer', { file: Buffer.from([0, 9, 99, 255]) }],
			['a Date', { at: new Date('2026-07-27T10:00:00.000Z') }],
			['long keys', { ['k'.repeat(500)]: 'v'.repeat(500) }],
			['many entries', Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]))],
			['many elements', Array.from({ length: 200 }, (_, i) => i * 7919)],
		])('holds for %s', (_label, value) => {
			expect(smallestExceededLimit(value)).toBeLessThanOrEqual(realSize(value));
		});

		it('holds for a sparse array, whose holes serialize as null', () => {
			const sparse = new Array<number>(4);
			sparse[0] = 1;
			sparse[3] = 2;

			expect(smallestExceededLimit(sparse)).toBeLessThanOrEqual(realSize(sparse));
		});
	});

	describe('reports an oversized value', () => {
		it.each<[string, () => unknown]>([
			['a long string', () => 'x'.repeat(3 * ONE_MIB)],
			['a string whose characters take three bytes each', () => '蟹'.repeat(ONE_MIB)],
			['a key whose characters take three bytes each', () => ({ ['蟹'.repeat(ONE_MIB)]: 0 })],
			['a string in an object', () => ({ blob: 'x'.repeat(3 * ONE_MIB) })],
			[
				'a string split across keys',
				() => ({ a: 'x'.repeat(ONE_MIB), b: 'y'.repeat(2 * ONE_MIB) }),
			],
			['a string nested in an array', () => ({ items: [{ blob: 'x'.repeat(3 * ONE_MIB) }] })],
			['an array of nulls', () => ({ items: new Array(600_000).fill(null) })],
			['an array of booleans', () => ({ items: new Array(500_000).fill(true) })],
			['an array of integers', () => Array.from({ length: 400_000 }, (_, i) => 1_000_000 + i)],
			['an array of empty objects', () => new Array(800_000).fill(0).map(() => ({}))],
			['a Buffer', () => ({ file: Buffer.alloc(3 * ONE_MIB) })],
			[
				'many keys',
				() => Object.fromEntries(Array.from({ length: 300_000 }, (_, i) => [`k${i}`, 0])),
			],
		])('reports %s', (_label, build) => {
			expect(jsonSizeExceeds(build(), 2 * ONE_MIB)).toBe(true);
		});
	});

	describe('reports a value within the limit', () => {
		it.each<[string, () => unknown]>([
			['a short string', () => 'hello'],
			['a long-but-allowed string', () => 'x'.repeat(ONE_MIB)],
			['a nested string', () => ({ outer: { inner: ['x'.repeat(ONE_MIB)] } })],
			['null', () => null],
			['a number', () => 42],
			['an empty object', () => ({})],
			['a small Buffer', () => ({ file: Buffer.alloc(ONE_MIB) })],
			[
				'a deeply nested value',
				() => {
					const root: Record<string, unknown> = {};
					let leaf = root;
					for (let depth = 0; depth < 100_000; depth++) {
						const next: Record<string, unknown> = {};
						leaf.n = next;
						leaf = next;
					}
					return root;
				},
			],
		])('accepts %s', (_label, build) => {
			expect(jsonSizeExceeds(build(), 2 * ONE_MIB)).toBe(false);
		});
	});

	it('measures a reference reached twice only once', () => {
		const shared = { blob: 'x'.repeat(ONE_MIB) };

		expect(jsonSizeExceeds({ a: shared, b: shared }, 2 * ONE_MIB)).toBe(false);
		expect(realSize({ a: shared, b: shared })).toBeGreaterThan(2 * ONE_MIB);
	});

	it('answers on a cyclic value instead of throwing', () => {
		const cyclic: Record<string, unknown> = { name: 'cycle' };
		cyclic.self = cyclic;

		expect(jsonSizeExceeds(cyclic, 2 * ONE_MIB)).toBe(false);
		expect(() => JSON.stringify(cyclic)).toThrow();
	});

	it('ignores inherited properties, which are not serialized', () => {
		const prototype = { inherited: 'x'.repeat(3 * ONE_MIB) };
		const value = Object.create(prototype) as Record<string, unknown>;
		value.own = 'small';

		expect(jsonSizeExceeds(value, 2 * ONE_MIB)).toBe(false);
	});

	it('stops walking once the limit is crossed', () => {
		const visited: string[] = [];
		const value = {
			untouched: {
				get deep() {
					visited.push('deep');
					return 'y';
				},
			},
			blob: 'x'.repeat(3 * ONE_MIB),
		};

		expect(jsonSizeExceeds(value, 2 * ONE_MIB)).toBe(true);
		expect(visited).toEqual([]);
	});

	it('stops walking a single wide container once the limit is crossed', () => {
		let read = 0;
		const elements = new Proxy(new Array(10_000_000).fill('x'.repeat(1000)), {
			get(target, property, receiver) {
				if (typeof property === 'string' && /^\d+$/.test(property)) {
					read += 1;
				}
				return Reflect.get(target, property, receiver) as unknown;
			},
		});

		expect(jsonSizeExceeds({ elements }, 2 * ONE_MIB)).toBe(true);
		expect(read).toBeLessThan(10_000);
	});

	it('reports any non-empty value against a zero limit', () => {
		expect(jsonSizeExceeds({ a: 1 }, 0)).toBe(true);
		expect(jsonSizeExceeds([null], 0)).toBe(true);
		expect(jsonSizeExceeds('', 0)).toBe(true);
		expect(jsonSizeExceeds({}, 0)).toBe(false); // the root's own delimiters are not counted
	});

	it('reports every value against a negative limit', () => {
		expect(jsonSizeExceeds({}, -1)).toBe(true);
		expect(jsonSizeExceeds([], -1)).toBe(true);
	});
});
