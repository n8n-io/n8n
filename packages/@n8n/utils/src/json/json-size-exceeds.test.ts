import { describe, expect, it } from 'vitest';

import { jsonSizeExceeds } from './json-size-exceeds';

const ONE_MIB = 1024 * 1024;

/** Size the estimator credits a value with, read off the limits it answers on. */
const measuredSize = (value: unknown) => {
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

	return within;
};

/** Size the value actually serializes to. Zero when it serializes to nothing. */
const realSize = (value: unknown) => {
	const serialized = JSON.stringify(value);
	return serialized === undefined ? 0 : Buffer.byteLength(serialized);
};

/** Deterministic generator, so that a failing value can be reproduced. */
const seeded = (seed: number) => () => {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed / 2147483648;
};

const pick = <T>(random: () => number, options: T[]) =>
	options[Math.floor(random() * options.length)];

const AWKWARD_STRINGS = [
	'',
	'plain text',
	'a"quoted"b',
	'back\\slash',
	'line\nbreak',
	'\u0001\u001f',
	'\b\t\r\f',
	'é accents',
	'蟹 three bytes',
	'🙂 pair',
	'\ud800',
	'\udfff',
	'\ud83d🙂',
	'k'.repeat(40),
];

/**
 * A value serialization replaces with a fixed result. The replacement is captured
 * rather than computed on call, so that the value has one serialization.
 */
const selfSerializing = (replacement: unknown) => ({ toJSON: () => replacement });

const randomLeaf = (random: () => number): unknown =>
	pick<unknown>(random, [
		pick(random, AWKWARD_STRINGS),
		Math.floor(random() * 1e9),
		-Math.floor(random() * 1e9),
		random(),
		random() * 10 ** Math.floor(random() * 40 - 20),
		pick(random, [0, -0, NaN, Infinity, -Infinity, 1e21, 5e-324, Number.MAX_SAFE_INTEGER]),
		pick(random, [true, false, null, undefined]),
		() => 'dropped',
		new Date(Math.floor(random() * 1e12)),
		new Date(NaN),
		Buffer.from([0, 7, 128, 255].slice(0, 1 + Math.floor(random() * 4))),
		new Uint8Array([1, 2, 255]),
		new Float64Array([1.5, -1e-7]),
		selfSerializing(pick(random, AWKWARD_STRINGS)),
		selfSerializing({ replaced: [1, 2] }),
		selfSerializing(undefined),
	]);

const randomValue = (random: () => number, depth: number): unknown => {
	if (depth === 0) {
		return randomLeaf(random);
	}

	const length = Math.floor(random() * 5);
	const members = Array.from({ length }, () => randomValue(random, depth - 1));

	return random() < 0.5
		? members
		: Object.fromEntries(
				members.map((member, index) => [pick(random, AWKWARD_STRINGS) + index, member]),
			);
};

describe('jsonSizeExceeds', () => {
	describe('never reports a size below the real one', () => {
		it.each<[string, unknown]>([
			['a string', 'hello'],
			['an empty string', ''],
			['a multi-byte string', 'pour sûr 😀'],
			['a multi-byte key', { ['clé 蟹']: 'valeur' }],
			['a string needing escapes', 'a"b\\c\nd'],
			['a string of quotes, which serialization doubles', '"'.repeat(50)],
			['a string of control characters, which serialization sextuples', '\u0001\u0002\u001f'],
			['a string of letter-escaped controls', '\b\t\n\f\r'],
			['a key needing escapes', { ['a"b\\c\n']: 1 }],
			['a lone high surrogate', '\ud800'],
			['a lone low surrogate', '\udfff'],
			['a surrogate pair', '🙂'],
			['a pair preceded by a lone surrogate', '\ud83d🙂'],
			['a pair split across strings', ['\ud83d', '\ude42']],
			['integers', [0, -0, 1, -1, 9, 10, 99, 100, 999999, 1000000]],
			['integers at every digit count', Array.from({ length: 21 }, (_, i) => 10 ** i)],
			['negative integers at every digit count', Array.from({ length: 21 }, (_, i) => -(10 ** i))],
			['integers just below powers of ten', [9, 99, 999, 999999999999999]],
			['extreme magnitudes', [1e20, 1e21, 1e22, 1e-7, 5e-324, Number.MAX_SAFE_INTEGER]],
			['the longest a number can serialize to', -0.0000075911789601505095],
			['non-finite numbers', [NaN, Infinity, -Infinity]],
			['floats', [0.1, -0.5, 1.5, -1.25e-300, 1.2345678901234567]],
			['keywords', [true, false, null]],
			['an empty object', {}],
			['an empty array', []],
			['nested containers', { a: {}, b: [], c: { d: [1, { e: 'f' }] }, g: [[], [[]]] }],
			['entries serialization drops', { kept: 1, gone: undefined, alsoGone: () => 0 }],
			['an element serialization turns into null', [1, undefined, 2]],
			['a nested Buffer', { file: Buffer.from([0, 9, 99, 255]) }],
			['an empty Buffer', { file: Buffer.alloc(0) }],
			['a Date', { at: new Date('2026-07-27T10:00:00.000Z') }],
			['an invalid Date, which serializes as null', { at: new Date(NaN) }],
			['a value serializing itself', { at: { toJSON: () => 'replaced' } }],
			['a value serializing itself into a container', { at: { toJSON: () => ({ a: [1, 2] }) } }],
			['a value serializing itself into nothing', { gone: { toJSON: () => undefined }, kept: 1 }],
			['a typed array, which serializes as index entries', { view: new Uint8Array([1, 255]) }],
			['a typed array of floats', { view: new Float64Array([1.5, -1e-7]) }],
			['an empty typed array', { view: new Uint8Array() }],
			[
				'a DataView, which serializes as an empty object',
				{ view: new DataView(new ArrayBuffer(4)) },
			],
			['long keys', { ['k'.repeat(500)]: 'v'.repeat(500) }],
			['many entries', Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]))],
			['many elements', Array.from({ length: 200 }, (_, i) => i * 7919)],
		])('holds for %s', (_label, value) => {
			expect(measuredSize(value)).toBeGreaterThanOrEqual(realSize(value));
		});

		it('holds for a container reached twice, which serialization repeats', () => {
			const shared = { s: 'x', n: [1, 2] };
			const value = { a: shared, b: shared };

			expect(measuredSize(value)).toBeGreaterThanOrEqual(realSize(value));
		});

		it('holds for a sparse array, whose holes serialize as null', () => {
			const sparse = new Array<number>(4);
			sparse[0] = 1;
			sparse[3] = 2;

			expect(measuredSize(sparse)).toBeGreaterThanOrEqual(realSize(sparse));
		});

		it('holds for generated values mixing every kind of member', () => {
			const random = seeded(20260730);
			const undersized: unknown[] = [];

			for (let count = 0; count < 400; count++) {
				const value = randomValue(random, 4);
				const real = realSize(value);
				const undersizedHere =
					measuredSize(value) < real || (real > 0 && !jsonSizeExceeds(value, real - 1));

				if (undersizedHere) {
					undersized.push(value);
				}
			}

			expect(undersized).toEqual([]);
		});
	});

	describe('overshoots by one byte per container with members', () => {
		it.each<[string, unknown, number]>([
			['a string root', 'hello', 0],
			['a number root', 42, 0],
			['an empty object', {}, 0],
			['an object whose only entry is dropped', { gone: undefined }, 0],
			['a flat object', { a: 1, b: 'two', c: true, d: null }, 1],
			['a flat array', [1, 'two', false, null], 1],
			['nested objects', { a: { b: { c: 1 } } }, 3],
			['an array of objects', [{ a: 1 }, { b: 2 }], 3],
			['escaped keys and values', { ['a"b']: 'c\nd\u0001é蟹🙂' }, 1],
			['a Date', { at: new Date('2026-07-27T10:00:00.000Z') }, 1],
			['a value serializing itself', { at: { toJSON: () => 'replaced' } }, 1],
			['integers of every length', { small: 7, big: 1234567890, negative: -42 }, 1],
			['non-integer numbers', { price: 1.5, ratio: -0.25, tiny: 5e-324 }, 1],
			['a number in exponential notation', { big: 1e21 }, 1],
		])('holds for %s', (_label, value, containers) => {
			expect(measuredSize(value)).toBe(realSize(value) + containers);
		});
	});

	describe('reports an oversized value', () => {
		it.each<[string, () => unknown]>([
			['a long string', () => 'x'.repeat(3 * ONE_MIB)],
			['a string whose characters take three bytes each', () => '蟹'.repeat(ONE_MIB)],
			['a key whose characters take three bytes each', () => ({ ['蟹'.repeat(ONE_MIB)]: 0 })],
			['a string in an object', () => ({ blob: 'x'.repeat(3 * ONE_MIB) })],
			['a string whose escapes double its size', () => ({ blob: '"'.repeat(1.5 * ONE_MIB + 1) })],
			[
				'a string whose escapes sextuple its size',
				() => ({ blob: '\u0001'.repeat(0.5 * ONE_MIB) }),
			],
			['a string of lone surrogates', () => ({ blob: '\ud800'.repeat(0.5 * ONE_MIB) })],
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
				'a Buffer whose bytes serialize as two characters each',
				() => ({ file: Buffer.alloc(1.5 * ONE_MIB) }),
			],
			['a typed array, whose index keys are serialized', () => ({ view: new Uint8Array(ONE_MIB) })],
			[
				'a value serializing itself into a long string',
				() => ({ at: { toJSON: () => 'x'.repeat(3 * ONE_MIB) } }),
			],
			[
				'many keys',
				() => Object.fromEntries(Array.from({ length: 300_000 }, (_, i) => [`k${i}`, 0])),
			],
		])('reports %s', (_label, build) => {
			const value = build();

			expect(realSize(value)).toBeGreaterThan(2 * ONE_MIB);
			expect(jsonSizeExceeds(value, 2 * ONE_MIB)).toBe(true);
		});
	});

	describe('reports a value within the limit', () => {
		it.each<[string, () => unknown]>([
			['a short string', () => 'hello'],
			['a long-but-allowed string', () => 'x'.repeat(ONE_MIB)],
			['a string of emoji', () => ({ blob: '🙂'.repeat(0.4 * ONE_MIB) })],
			['a nested string', () => ({ outer: { inner: ['x'.repeat(ONE_MIB)] } })],
			['null', () => null],
			['a number', () => 42],
			['an empty object', () => ({})],
			['a small Buffer', () => ({ file: Buffer.alloc(0.4 * ONE_MIB) })],
			['a Date', () => ({ at: new Date() })],
			[
				'many small entries',
				() => Object.fromEntries(Array.from({ length: 20_000 }, (_, i) => [`k${i}`, i])),
			],
		])('accepts %s', (_label, build) => {
			const value = build();

			expect(realSize(value)).toBeLessThanOrEqual(2 * ONE_MIB);
			expect(jsonSizeExceeds(value, 2 * ONE_MIB)).toBe(false);
		});
	});

	it('measures every occurrence of a container reached twice', () => {
		const shared = { blob: 'x'.repeat(1.5 * ONE_MIB) };

		expect(jsonSizeExceeds({ a: shared, b: shared }, 2 * ONE_MIB)).toBe(true);
		expect(realSize({ a: shared, b: shared })).toBeGreaterThan(2 * ONE_MIB);
	});

	it('answers on a structure whose paths outnumber its containers', () => {
		let node: Record<string, unknown> = { leaf: 'x'.repeat(1000) };
		for (let depth = 0; depth < 40; depth++) {
			node = { a: node, b: node };
		}

		expect(jsonSizeExceeds(node, 2 * ONE_MIB)).toBe(true);
	});

	it('answers on a value nested deeper than serialization can go', () => {
		const root: Record<string, unknown> = {};
		let leaf = root;
		for (let depth = 0; depth < 100_000; depth++) {
			const next: Record<string, unknown> = {};
			leaf.n = next;
			leaf = next;
		}

		expect(jsonSizeExceeds(root, 2 * ONE_MIB)).toBe(false);
		expect(() => JSON.stringify(root)).toThrow(RangeError);
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

	it('reads members in the order serialization reads them', () => {
		const build = (read: string[]) => ({
			get first() {
				read.push('first');
				return {
					get nested() {
						read.push('nested');
						return 'x';
					},
				};
			},
			get second() {
				read.push('second');
				return [
					{
						get deep() {
							read.push('deep');
							return 1;
						},
					},
				];
			},
			get third() {
				read.push('third');
				return true;
			},
		});

		const walked: string[] = [];
		const serialized: string[] = [];
		jsonSizeExceeds(build(walked), Number.MAX_SAFE_INTEGER);
		JSON.stringify(build(serialized));

		expect(walked).toEqual(serialized);
		expect(walked).toEqual(['first', 'nested', 'second', 'deep', 'third']);
	});

	it('stops walking once the limit is crossed', () => {
		const visited: string[] = [];
		const value = {
			blob: 'x'.repeat(3 * ONE_MIB),
			untouched: {
				get deep() {
					visited.push('deep');
					return 'y';
				},
			},
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

	it('stops measuring a single oversized string once the limit is crossed', () => {
		const value = { blob: 'x'.repeat(64 * ONE_MIB) };

		expect(jsonSizeExceeds(value, ONE_MIB)).toBe(true);
	});

	it('reports any non-empty value against a zero limit', () => {
		expect(jsonSizeExceeds({ a: 1 }, 0)).toBe(true);
		expect(jsonSizeExceeds([null], 0)).toBe(true);
		expect(jsonSizeExceeds('', 0)).toBe(true);
		expect(jsonSizeExceeds({}, 0)).toBe(true); // the root's own delimiters count
		expect(jsonSizeExceeds({}, 2)).toBe(false);
	});

	it('reports every value against a negative limit', () => {
		expect(jsonSizeExceeds({}, -1)).toBe(true);
		expect(jsonSizeExceeds([], -1)).toBe(true);
	});
});
