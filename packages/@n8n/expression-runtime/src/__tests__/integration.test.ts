import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { runInNewContext } from 'node:vm';

import { DateTime, Duration, Interval } from 'luxon';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';
import { QuickJsBridge } from '../bridge/quickjs-bridge';
import type { WorkflowData } from '../types';
import { TimeoutError, MemoryLimitError } from '../types';
import { createBridge, engineName, isQuickJS, newBridge } from './test-bridge';

describe(`Integration: ExpressionEvaluator (${engineName})`, () => {
	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({
			createBridge,
			maxCodeCacheSize: 1024,
		});
		await evaluator.initialize();
		await evaluator.acquire(caller);
	});

	afterAll(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	it('should evaluate simple property access', async () => {
		const data = {
			$json: { email: 'test@example.com' },
		};

		const result = evaluator.evaluate('{{ $json.email }}', data, caller);

		expect(result).toBe('test@example.com');
	});

	it('should evaluate nested property access', async () => {
		const data = {
			$json: {
				user: {
					profile: {
						name: 'John Doe',
					},
				},
			},
		};

		const result = evaluator.evaluate('{{ $json.user.profile.name }}', data, caller);

		expect(result).toBe('John Doe');
	});

	it('should evaluate array access', async () => {
		const data = {
			$json: {
				items: [{ id: 1 }, { id: 2 }, { id: 3 }],
			},
		};

		const result = evaluator.evaluate('{{ $json.items[1].id }}', data, caller);

		expect(result).toBe(2);
	});

	it('should evaluate math operations', async () => {
		const data = {
			$json: {
				price: 100,
				quantity: 3,
			},
		};

		const result = evaluator.evaluate('{{ $json.price * $json.quantity }}', data, caller);

		expect(result).toBe(300);
	});

	it('should use luxon DateTime', async () => {
		const data = {
			$json: {
				date: '2024-01-15',
			},
		};

		const result = evaluator.evaluate(
			'{{ DateTime.fromISO($json.date).toFormat("MMMM dd, yyyy") }}',
			data,
			caller,
		);

		expect(result).toBe('January 15, 2024');
	});

	it('should invoke functions from workflow data', async () => {
		const data = {
			$items: function () {
				return 'items-result';
			},
		};

		const result = evaluator.evaluate('{{ $items() }}', data, caller);

		expect(result).toBe('items-result');
	});

	it('should marshal falsy and primitive values', () => {
		const data = {
			$json: {
				zero: 0,
				empty: '',
				field: null,
				active: true,
				items: ['first', 'second'],
				numbers: [42, 99],
			},
		};

		expect(evaluator.evaluate('{{ $json.zero }}', data, caller)).toBe(0);
		expect(evaluator.evaluate('{{ $json.empty }}', data, caller)).toBe('');
		expect(evaluator.evaluate('{{ $json.field }}', data, caller)).toBeNull();
		expect(evaluator.evaluate('{{ $json.active }}', data, caller)).toBe(true);
		// getArrayElement: falsy index 0 and primitive element
		expect(evaluator.evaluate('{{ $json.items[0] }}', data, caller)).toBe('first');
		expect(evaluator.evaluate('{{ $json.numbers[0] }}', data, caller)).toBe(42);
	});

	it('should evaluate array .length', () => {
		const data = {
			$json: { items: [1, 2, 3] },
		};

		expect(evaluator.evaluate('{{ $json.items.length }}', data, caller)).toBe(3);
	});

	it('should handle large arrays with lazy loading', async () => {
		const data = {
			$json: {
				// Create array with 200 items to exercise lazy loading
				items: Array.from({ length: 200 }, (_, i) => ({ id: i })),
			},
		};

		// Access element deep in the array via lazy proxy
		const result = evaluator.evaluate('{{ $json.items[150].id }}', data, caller);

		expect(result).toBe(150);
	});

	it('should render the timezone independent of the global JSON.stringify', async () => {
		const data = { $json: { x: 'ok' } };
		const original = JSON.stringify;
		let result: unknown;
		try {
			JSON.stringify = (() => 'REPLACED_STRINGIFY_OUTPUT') as unknown as typeof JSON.stringify;
			result = evaluator.evaluate('{{ $json.x }}', data, caller, {
				timezone: 'America/New_York',
			});
		} finally {
			JSON.stringify = original;
		}

		expect(result).toBe('ok');
	});

	it('should use provided timezone for DateTime operations', async () => {
		const data = {
			$json: { ts: 1704067200000 }, // 2024-01-01T00:00:00Z
		};

		const result = evaluator.evaluate(
			'{{ DateTime.fromMillis($json.ts).toFormat("HH:mm ZZ") }}',
			data,
			caller,
			{ timezone: 'America/New_York' },
		);

		// Midnight UTC = 7pm previous day in New York (EST = UTC-5)
		expect(result).toBe('19:00 -05:00');
	});

	it('should use different timezone when specified', async () => {
		const data = {
			$json: { ts: 1704067200000 }, // 2024-01-01T00:00:00Z
		};

		const result = evaluator.evaluate(
			'{{ DateTime.fromMillis($json.ts).toFormat("HH:mm ZZ") }}',
			data,
			caller,
			{ timezone: 'Asia/Tokyo' },
		);

		// Midnight UTC = 9am in Tokyo (JST = UTC+9)
		expect(result).toBe('09:00 +09:00');
	});

	describe('Value types at the transfer boundary', () => {
		describe.each([
			{ label: 'returns a custom result', parser: '() => ({ name: "custom" })' },
			{ label: 'throws', parser: '() => { throw new Error("custom parser"); }' },
		])('host data with a JSON parser that $label', ({ parser }) => {
			it.each(['$json.profile.name', '$json.rows[0].name', '$input.first().json.profile.name'])(
				'reads %s',
				(access) => {
					const json = { profile: { name: 'from host' }, rows: [{ name: 'from host' }] };
					const data = { $json: json, $input: { first: () => ({ json }) } };

					expect(
						evaluator.evaluate(
							`{{ (() => { const original = JSON.parse; JSON.parse = ${parser}; try { return ${access}; } finally { JSON.parse = original; } })() }}`,
							data,
							caller,
						),
					).toBe('from host');
				},
			);
		});

		describe.each([
			{ label: 'plain', properties: {} },
			{ label: 'transfer marker', properties: { __n8nType: 'user data' } },
			{ label: 'bridge marker', properties: { __isDate: true } },
		])('own JSON keys in a $label object', ({ properties }) => {
			const payload = {
				...(JSON.parse('{"__proto__":{"flag":1},"kept":2}') as Record<string, unknown>),
				...properties,
			};

			it.each(['$json.error', '$input.first().json.error'])(
				'keeps own JSON keys when reading %s',
				(access) => {
					const error = Object.assign(new Error('from host'), { payload });
					const data = { $json: { error }, $input: { first: () => ({ json: { error } }) } };

					expect(
						evaluator.evaluate(
							`{{ (() => { const value = ${access}.payload; return [Object.hasOwn(value, "__proto__"), Object.entries(value)]; })() }}`,
							data,
							caller,
						),
					).toEqual([true, Object.entries(payload)]);
				},
			);

			it.each([
				{ label: 'plain object', expression: '({ payload })' },
				{ label: 'Error', expression: 'Object.assign(new Error("from guest"), { payload })' },
				{
					label: 'class instance',
					expression: 'new (class { constructor() { this.payload = payload; } })()',
				},
			])('keeps own JSON keys when returning a $label', ({ expression }) => {
				const result = evaluator.evaluate(
					`{{ (() => { const payload = JSON.parse(${JSON.stringify(JSON.stringify(payload))}); return ${expression}; })() }}`,
					{},
					caller,
				) as { payload: Record<string, unknown> };

				expect(Object.hasOwn(result.payload, '__proto__')).toBe(true);
				expect(result.payload).toStrictEqual(payload);
				expect(Object.getPrototypeOf(result.payload)).toBe(Object.prototype);
			});
		});

		it('should not affect primitive return values', () => {
			const data = { $json: { count: 42 } };
			expect(evaluator.evaluate('{{ $json.count }}', data, caller)).toBe(42);
			expect(evaluator.evaluate('{{ $json.count > 10 }}', data, caller)).toBe(true);
			expect(evaluator.evaluate('{{ "hello" }}', data, caller)).toBe('hello');
		});

		it('should return a user object with transfer marker keys as plain data', () => {
			const data = { $json: {} };

			const result = evaluator.evaluate(
				'{{ ({ __n8nType: "DateTime", __isoString: "2024-01-15T00:00:00.000Z", __zone: "UTC" }) }}',
				data,
				caller,
			);

			expect(result).not.toBeInstanceOf(DateTime);
			expect(result).toEqual({
				__n8nType: 'DateTime',
				__isoString: '2024-01-15T00:00:00.000Z',
				__zone: 'UTC',
			});
		});

		it('should return a class instance with transfer marker keys as plain data', () => {
			const data = { $json: {} };

			const result = evaluator.evaluate(
				'{{ (function(){ function Marker(){ this.__n8nType = "DateTime"; this.__isoString = "2024-01-15T00:00:00.000Z"; this.__zone = "UTC"; } return new Marker(); })() }}',
				data,
				caller,
			);

			expect(result).not.toBeInstanceOf(DateTime);
			expect(result).toEqual({
				__n8nType: 'DateTime',
				__isoString: '2024-01-15T00:00:00.000Z',
				__zone: 'UTC',
			});
		});

		it('should return an object with transfer marker keys inside a Map or a Set as plain data', () => {
			const data = { $json: {} };
			const marker =
				'{ __n8nType: "DateTime", __isoString: "2024-01-15T00:00:00.000Z", __zone: "UTC" }';
			const expected = {
				__n8nType: 'DateTime',
				__isoString: '2024-01-15T00:00:00.000Z',
				__zone: 'UTC',
			};

			const fromMap = evaluator.evaluate(`{{ new Map([["k", ${marker}]]) }}`, data, caller);
			const fromSet = evaluator.evaluate(`{{ new Set([${marker}]) }}`, data, caller);

			expect(fromMap).toBeInstanceOf(Map);
			const mapEntry = (fromMap as Map<string, unknown>).get('k');
			expect(mapEntry).not.toBeInstanceOf(DateTime);
			expect(mapEntry).toEqual(expected);

			expect(fromSet).toBeInstanceOf(Set);
			const [setEntry] = [...(fromSet as Set<unknown>)];
			expect(setEntry).not.toBeInstanceOf(DateTime);
			expect(setEntry).toEqual(expected);
		});

		it('should convert the values inside an object with an __isError key in a Map or a Set', () => {
			const data = { $json: {} };
			const flagged =
				'{ __isError: true, when: new Date("2024-01-15T00:00:00.000Z"), n: NaN, tags: new Set([1]) }';
			const expected = {
				__isError: true,
				when: new Date('2024-01-15T00:00:00.000Z'),
				n: NaN,
				tags: new Set([1]),
			};

			const fromMap = evaluator.evaluate(`{{ new Map([["k", ${flagged}]]) }}`, data, caller);
			const fromSet = evaluator.evaluate(`{{ new Set([${flagged}]) }}`, data, caller);

			expect((fromMap as Map<string, unknown>).get('k')).toEqual(expected);
			expect([...(fromSet as Set<unknown>)]).toEqual([expected]);
		});

		it('should return a user object with an __isError key as data', () => {
			const data = { $json: { flag: { __isError: true, message: 'from data' } } };

			expect(
				evaluator.evaluate('{{ ({ __isError: true, message: "hi" }) }}', data, caller),
			).toEqual({ __isError: true, message: 'hi' });
			expect(evaluator.evaluate('{{ $json.flag }}', data, caller)).toEqual({
				__isError: true,
				message: 'from data',
			});
		});

		describe.each([
			{ key: '__isError', properties: { __isError: true } },
			{ key: '__isArray', properties: { __isArray: true, __length: 2 } },
			{ key: '__isObject', properties: { __isObject: true, __keys: ['message'] } },
		])('Error data with $key', ({ key, properties }) => {
			it.each(['$error', '$json.error', '$json.errors[0]'])('reads %s as an Error', (access) => {
				const error = Object.assign(new Error('from data'), properties);
				const json = { error, errors: [error] };
				const data = { $error: error, $json: json, $input: { first: () => ({ json }) } };

				expect(evaluator.evaluate('{{ $input.first().json.error.message }}', data, caller)).toBe(
					'from data',
				);
				expect(
					evaluator.evaluate(
						`{{ (() => { const error = ${access}; return [error.message, error.name, error instanceof Error, Array.isArray(error), error.${key}]; })() }}`,
						data,
						caller,
					),
				).toEqual(['from data', 'Error', true, false, true]);
			});
		});

		it('finds Error data with an __isError key through the in operator', () => {
			const error = Object.assign(new Error('from data'), { __isError: true });

			expect(evaluator.evaluate('{{ "error" in $json }}', { $json: { error } }, caller)).toBe(true);
		});

		it('should convert the values inside an object with an __isError key in an object or an array', () => {
			const data = { $json: {} };
			const flagged =
				'{ __isError: true, when: new Date("2024-01-15T00:00:00.000Z"), n: NaN, tags: new Set([1]), u: undefined }';
			const expected = {
				__isError: true,
				when: new Date('2024-01-15T00:00:00.000Z'),
				n: NaN,
				tags: new Set([1]),
				u: undefined,
			};

			expect(evaluator.evaluate(`{{ ({ a: ${flagged} }) }}`, data, caller)).toStrictEqual({
				a: expected,
			});
			expect(evaluator.evaluate(`{{ [${flagged}] }}`, data, caller)).toStrictEqual([expected]);
		});

		it('should give host-call data with an __isError key to the expression as data', () => {
			const item = {
				json: {
					flag: { __isError: true, message: 'm', when: new Date('2024-01-15T00:00:00.000Z') },
				},
			};
			const data = {
				$input: {
					first: () => item,
					last: () => ({ __isError: true, message: 'root' }),
					all: () => ({ __n8nEscaped: true, __value: 1 }),
				},
			};

			expect(evaluator.evaluate('{{ $input.first() }}', data, caller)).toEqual(item);
			expect(
				evaluator.evaluate('{{ $input.first().json.flag.when.getTime() }}', data, caller),
			).toBe(item.json.flag.when.getTime());
			expect(evaluator.evaluate('{{ $input.last().message }}', data, caller)).toBe('root');
			expect(evaluator.evaluate('{{ $input.all() }}', data, caller)).toEqual({
				__n8nEscaped: true,
				__value: 1,
			});
		});

		it('should preserve Date objects (structured-cloneable)', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate('{{ new Date(2024, 0, 15) }}', data, caller);
			expect(result).toBeInstanceOf(Date);
			expect((result as Date).getFullYear()).toBe(2024);
			expect((result as Date).getMonth()).toBe(0);
			expect((result as Date).getDate()).toBe(15);
		});

		describe('Boxed primitives', () => {
			it.each([
				{ expr: 'new String("ab")', expected: 'ab' },
				{ expr: 'new String("")', expected: '' },
				{ expr: 'new String("x\\u0000y")', expected: 'x\0y' },
				{ expr: 'new String("\\ud800")', expected: '\ud800' },
			])('should return $expr as a String object', ({ expr, expected }) => {
				const result = evaluator.evaluate(`{{ ${expr} }}`, { $json: {} }, caller);

				expect(result).toBeInstanceOf(String);
				expect((result as { valueOf(): string }).valueOf()).toBe(expected);
			});

			it.each([
				{ expr: 'new Number(5)', expected: 5 },
				{ expr: 'new Number(0)', expected: 0 },
				{ expr: 'new Number(-0)', expected: -0 },
				{ expr: 'new Number(NaN)', expected: NaN },
				{ expr: 'new Number(Infinity)', expected: Infinity },
				{ expr: 'new Number(-Infinity)', expected: -Infinity },
			])('should return $expr as a Number object', ({ expr, expected }) => {
				const result = evaluator.evaluate(`{{ ${expr} }}`, { $json: {} }, caller);

				expect(result).toBeInstanceOf(Number);
				expect(Object.is((result as { valueOf(): number }).valueOf(), expected)).toBe(true);
			});

			it.each([
				{ expr: 'new Boolean(true)', expected: true },
				{ expr: 'new Boolean(false)', expected: false },
			])('should return $expr as a Boolean object', ({ expr, expected }) => {
				const result = evaluator.evaluate(`{{ ${expr} }}`, { $json: {} }, caller);

				expect(result).toBeInstanceOf(Boolean);
				expect((result as { valueOf(): boolean }).valueOf()).toBe(expected);
			});

			it.each([
				{ expr: 'Object(1n)', expected: 1n },
				{ expr: 'Object(-9007199254740993n)', expected: -9007199254740993n },
			])('should return $expr as a BigInt object', ({ expr, expected }) => {
				const result = evaluator.evaluate(`{{ ${expr} }}`, { $json: {} }, caller);

				expect(result).toBeInstanceOf(BigInt);
				expect((result as { valueOf(): bigint }).valueOf()).toBe(expected);
			});

			it('should preserve boxed primitives in objects, arrays, Maps, Sets, Errors and class instances', () => {
				const inObject = evaluator.evaluate(
					'{{ ({ s: new String("ab"), n: new Number(-0), b: new Boolean(false), bi: Object(1n) }) }}',
					{ $json: {} },
					caller,
				) as Record<string, { valueOf(): unknown }>;
				expect(inObject.s).toBeInstanceOf(String);
				expect(inObject.s.valueOf()).toBe('ab');
				expect(inObject.n).toBeInstanceOf(Number);
				expect(Object.is(inObject.n.valueOf(), -0)).toBe(true);
				expect(inObject.b).toBeInstanceOf(Boolean);
				expect(inObject.b.valueOf()).toBe(false);
				expect(inObject.bi).toBeInstanceOf(BigInt);
				expect(inObject.bi.valueOf()).toBe(1n);

				const inArray = evaluator.evaluate(
					'{{ [new String("ab"), new Number(NaN), new Boolean(true), Object(2n)] }}',
					{ $json: {} },
					caller,
				) as Array<{ valueOf(): unknown }>;
				expect(inArray[0]).toBeInstanceOf(String);
				expect(inArray[0].valueOf()).toBe('ab');
				expect(inArray[1]).toBeInstanceOf(Number);
				expect(Number.isNaN(inArray[1].valueOf())).toBe(true);
				expect(inArray[2]).toBeInstanceOf(Boolean);
				expect(inArray[2].valueOf()).toBe(true);
				expect(inArray[3]).toBeInstanceOf(BigInt);
				expect(inArray[3].valueOf()).toBe(2n);

				const inMap = evaluator.evaluate(
					'{{ new Map([[new String("k"), new Number(5)]]) }}',
					{ $json: {} },
					caller,
				) as Map<{ valueOf(): unknown }, { valueOf(): unknown }>;
				const [[mapKey, mapVal]] = [...inMap.entries()];
				expect(mapKey).toBeInstanceOf(String);
				expect(mapKey.valueOf()).toBe('k');
				expect(mapVal).toBeInstanceOf(Number);
				expect(mapVal.valueOf()).toBe(5);

				const inSet = evaluator.evaluate(
					'{{ new Set([new Boolean(false)]) }}',
					{ $json: {} },
					caller,
				) as Set<{ valueOf(): unknown }>;
				const [setVal] = [...inSet.values()];
				expect(setVal).toBeInstanceOf(Boolean);
				expect(setVal.valueOf()).toBe(false);

				const inError = evaluator.evaluate(
					'{{ Object.assign(new Error("e", { cause: new String("c") }), { s: new String("ab"), n: new Number(5), b: new Boolean(true), bi: Object(3n) }) }}',
					{ $json: {} },
					caller,
				) as Error & Record<string, { valueOf(): unknown }>;
				expect(inError).toBeInstanceOf(Error);
				expect(inError.cause).toBeInstanceOf(String);
				expect((inError.cause as { valueOf(): unknown }).valueOf()).toBe('c');
				expect(inError.s).toBeInstanceOf(String);
				expect(inError.s.valueOf()).toBe('ab');
				expect(inError.n).toBeInstanceOf(Number);
				expect(inError.n.valueOf()).toBe(5);
				expect(inError.b).toBeInstanceOf(Boolean);
				expect(inError.b.valueOf()).toBe(true);
				expect(inError.bi).toBeInstanceOf(BigInt);
				expect(inError.bi.valueOf()).toBe(3n);

				const inClass = evaluator.evaluate(
					'{{ (() => { class Box { constructor() { this.s = new String("ab"); this.n = new Number(5); this.b = new Boolean(true); } } return new Box(); })() }}',
					{ $json: {} },
					caller,
				) as Record<string, { valueOf(): unknown }>;
				expect(inClass.s).toBeInstanceOf(String);
				expect(inClass.s.valueOf()).toBe('ab');
				expect(inClass.n).toBeInstanceOf(Number);
				expect(inClass.n.valueOf()).toBe(5);
				expect(inClass.b).toBeInstanceOf(Boolean);
				expect(inClass.b.valueOf()).toBe(true);
			});

			it('should keep real subclasses and ignore overridden valueOf or extra marker keys', () => {
				const subclasses = evaluator.evaluate(
					'{{ (() => { class S extends String {} class N extends Number {} class B extends Boolean {} return [new S("ab"), new N(5), new B(false)]; })() }}',
					{ $json: {} },
					caller,
				) as Array<{ valueOf(): unknown }>;
				expect(subclasses[0]).toBeInstanceOf(String);
				expect(subclasses[0].valueOf()).toBe('ab');
				expect(subclasses[1]).toBeInstanceOf(Number);
				expect(subclasses[1].valueOf()).toBe(5);
				expect(subclasses[2]).toBeInstanceOf(Boolean);
				expect(subclasses[2].valueOf()).toBe(false);

				const mutated = evaluator.evaluate(
					'{{ Object.assign(new String("ab"), { valueOf: () => "fake", __n8nType: "DateTime", __isoString: "2024-01-15T00:00:00.000Z", __isError: true }) }}',
					{ $json: {} },
					caller,
				);
				expect(mutated).toBeInstanceOf(String);
				expect(mutated).not.toBeInstanceOf(DateTime);
				expect((mutated as { valueOf(): string }).valueOf()).toBe('ab');
				expect(Object.keys(mutated as object)).toEqual(['0', '1']);
			});

			it('should return prototype-only wrapper mimics as plain objects', () => {
				for (const proto of ['String', 'Number', 'Boolean', 'BigInt']) {
					const result = evaluator.evaluate(
						`{{ Object.create(${proto}.prototype) }}`,
						{ $json: {} },
						caller,
					);
					expect(result).toStrictEqual({});
				}

				const spoof = evaluator.evaluate(
					'{{ Object.assign(Object.create(String.prototype), { __n8nType: "DateTime", __isoString: "2024-01-15T00:00:00.000Z" }) }}',
					{ $json: {} },
					caller,
				);
				expect(spoof).not.toBeInstanceOf(DateTime);
				expect(spoof).toStrictEqual({
					__n8nType: 'DateTime',
					__isoString: '2024-01-15T00:00:00.000Z',
				});
			});

			it('should read boxed primitives from workflow data through lazy proxies and host calls', () => {
				const err = Object.assign(new Error('from host', { cause: Object('cause') }), {
					s: Object('ab'),
				});
				const json = {
					s: Object('x\0y'),
					n: Object(-0),
					nan: Object(NaN),
					b: Object(false),
					bi: Object(9007199254740993n),
					xr: runInNewContext('new String("xr")') as object,
					arr: [Object('item')],
					err,
				};
				const data = { $json: json, $input: { first: () => ({ json }) } };

				for (const root of ['$json', '$input.first().json']) {
					const s = evaluator.evaluate(`{{ ${root}.s }}`, data, caller);
					expect(s).toBeInstanceOf(String);
					expect((s as { valueOf(): string }).valueOf()).toBe('x\0y');

					const n = evaluator.evaluate(`{{ ${root}.n }}`, data, caller);
					expect(n).toBeInstanceOf(Number);
					expect(Object.is((n as { valueOf(): number }).valueOf(), -0)).toBe(true);

					const nan = evaluator.evaluate(`{{ ${root}.nan }}`, data, caller);
					expect(nan).toBeInstanceOf(Number);
					expect(Number.isNaN((nan as { valueOf(): number }).valueOf())).toBe(true);

					const b = evaluator.evaluate(`{{ ${root}.b }}`, data, caller);
					expect(b).toBeInstanceOf(Boolean);
					expect((b as { valueOf(): boolean }).valueOf()).toBe(false);

					const bi = evaluator.evaluate(`{{ ${root}.bi }}`, data, caller);
					expect(bi).toBeInstanceOf(BigInt);
					expect((bi as { valueOf(): bigint }).valueOf()).toBe(9007199254740993n);

					const xr = evaluator.evaluate(`{{ ${root}.xr }}`, data, caller);
					expect(xr).toBeInstanceOf(String);
					expect((xr as { valueOf(): string }).valueOf()).toBe('xr');

					const arrItem = evaluator.evaluate(`{{ ${root}.arr[0] }}`, data, caller);
					expect(arrItem).toBeInstanceOf(String);
					expect((arrItem as { valueOf(): string }).valueOf()).toBe('item');

					const errStr = evaluator.evaluate(`{{ ${root}.err.s }}`, data, caller);
					expect(errStr).toBeInstanceOf(String);
					expect((errStr as { valueOf(): string }).valueOf()).toBe('ab');

					expect(evaluator.evaluate(`{{ ${root}.s instanceof String }}`, data, caller)).toBe(true);
				}
			});

			it('should read circular, getter-backed, and error-bearing own fields on boxed primitives lazily', () => {
				const selfRef = Object('ab') as object & { self?: unknown };
				selfRef.self = selfRef;

				const cycleA = Object('a') as object & { other?: unknown };
				const cycleB = Object(2) as object & { other?: unknown };
				cycleA.other = cycleB;
				cycleB.other = cycleA;

				const readLazy = vi.fn(() => 'computed');
				const withGetters = Object('ab') as object;
				Object.defineProperty(withGetters, 'ok', { value: 1, enumerable: true });
				Object.defineProperty(withGetters, 'lazy', { get: readLazy, enumerable: true });
				Object.defineProperty(withGetters, 'boom', {
					get() {
						const err = new Error('getter boom');
						err.name = 'ExpressionError';
						throw err;
					},
					enumerable: true,
				});

				const withErrorValue = Object.assign(Object('ab') as object, {
					ok: 2,
					err: new Error('field error'),
				});
				const withHiddenOnly = Object.defineProperty(Object(5) as object, 'meta', { value: 1 });
				const withHiddenAndEnum = Object.defineProperty(
					Object.assign(Object('ab') as object, { visible: 'yes' }),
					'secret',
					{ value: 'no' },
				);
				const topLevel = Object.assign(Object('top') as object, { tag: 'root' });

				const data = {
					$json: {
						selfRef,
						cycleA,
						withGetters,
						withErrorValue,
						withHiddenOnly,
						withHiddenAndEnum,
					},
					$topBoxed: topLevel,
				};

				expect(evaluator.evaluate('{{ $json.selfRef + "!" }}', data, caller)).toBe('ab!');
				expect(evaluator.evaluate('{{ $json.selfRef.self + "!" }}', data, caller)).toBe('ab!');
				expect(evaluator.evaluate('{{ $json.selfRef.self instanceof String }}', data, caller)).toBe(
					true,
				);
				expect(evaluator.evaluate('{{ $json.cycleA.other + 1 }}', data, caller)).toBe(3);
				expect(evaluator.evaluate('{{ $json.cycleA.other.other + "!" }}', data, caller)).toBe('a!');

				expect(evaluator.evaluate('{{ $json.withGetters + "!" }}', data, caller)).toBe('ab!');
				expect(evaluator.evaluate('{{ $json.withGetters.ok }}', data, caller)).toBe(1);
				expect(evaluator.evaluate('{{ Object.keys($json.withGetters) }}', data, caller)).toEqual([
					'0',
					'1',
					'ok',
					'lazy',
					'boom',
				]);
				expect(readLazy).not.toHaveBeenCalled();

				expect(
					evaluator.evaluate(
						'{{ [$json.withGetters.lazy, $json.withGetters.lazy] }}',
						data,
						caller,
					),
				).toEqual(['computed', 'computed']);
				expect(readLazy).toHaveBeenCalledTimes(1);

				expect(() => evaluator.evaluate('{{ $json.withGetters.boom }}', data, caller)).toThrow(
					'getter boom',
				);

				expect(evaluator.evaluate('{{ $json.withErrorValue.ok }}', data, caller)).toBe(2);
				expect(
					evaluator.evaluate('{{ $json.withErrorValue.err instanceof Error }}', data, caller),
				).toBe(true);
				expect(evaluator.evaluate('{{ $json.withErrorValue.err.message }}', data, caller)).toBe(
					'field error',
				);

				expect(evaluator.evaluate('{{ $json.withHiddenOnly.meta }}', data, caller)).toBe(1);
				expect(evaluator.evaluate('{{ $json.withHiddenOnly + 1 }}', data, caller)).toBe(6);
				expect(evaluator.evaluate('{{ Object.keys($json.withHiddenOnly) }}', data, caller)).toEqual(
					[],
				);
				expect(evaluator.evaluate('{{ $json.withHiddenAndEnum.secret }}', data, caller)).toBe('no');
				expect(evaluator.evaluate('{{ $json.withHiddenAndEnum.visible }}', data, caller)).toBe(
					'yes',
				);
				expect(
					evaluator.evaluate('{{ Object.keys($json.withHiddenAndEnum) }}', data, caller),
				).toEqual(['0', '1', 'visible']);

				expect(evaluator.evaluate('{{ $topBoxed + "!" }}', data, caller)).toBe('top!');
				expect(evaluator.evaluate('{{ $topBoxed.tag }}', data, caller)).toBe('root');
			});
		});
	});

	describe('Luxon values returned to the host', () => {
		it('should return $now as a valid luxon DateTime in the system zone', () => {
			const data = { $json: {} };

			const result = evaluator.evaluate('{{ $now }}', data, caller);

			expect(result).toBeInstanceOf(DateTime);
			expect((result as DateTime).isValid).toBe(true);
			expect((result as DateTime).zone.type).toBe('system');
			expect(Math.abs((result as DateTime).toMillis() - Date.now())).toBeLessThan(60_000);
		});

		it('should keep the name of a named zone', () => {
			const data = { $json: {} };

			const result = evaluator.evaluate(
				'{{ DateTime.fromISO("2024-01-15T12:00:00", { zone: "Europe/Paris" }) }}',
				data,
				caller,
			);

			expect(result).toBeInstanceOf(DateTime);
			expect((result as DateTime).isValid).toBe(true);
			expect((result as DateTime).zoneName).toBe('Europe/Paris');
			expect((result as DateTime).toISO()).toBe('2024-01-15T12:00:00.000+01:00');
		});

		it('should return a Duration and an Interval as luxon instances', () => {
			const data = { $json: {} };

			const duration = evaluator.evaluate('{{ Duration.fromMillis(3600000) }}', data, caller);
			const interval = evaluator.evaluate(
				'{{ Interval.after(DateTime.fromISO("2024-01-01"), 86400000) }}',
				data,
				caller,
			);

			expect(duration).toBeInstanceOf(Duration);
			expect((duration as Duration).toMillis()).toBe(3600000);
			expect(interval).toBeInstanceOf(Interval);
			expect((interval as Interval).length('milliseconds')).toBe(86400000);
		});

		it('should return a DateTime inside an object or an array as a luxon DateTime', () => {
			const data = { $json: {} };

			const inObject = evaluator.evaluate(
				'{{ ({ date: DateTime.fromISO("2024-01-15") }) }}',
				data,
				caller,
			) as Record<string, unknown>;
			const inArray = evaluator.evaluate(
				'{{ [DateTime.fromISO("2024-01-15")] }}',
				data,
				caller,
			) as unknown[];

			for (const value of [inObject.date, inArray[0]]) {
				expect(value).toBeInstanceOf(DateTime);
				expect((value as DateTime).isValid).toBe(true);
				expect((value as DateTime).toISODate()).toBe('2024-01-15');
			}
		});

		it('should return an invalid DateTime, Duration or Interval as an invalid instance', () => {
			const data = { $json: {} };

			const dateTime = evaluator.evaluate('{{ DateTime.invalid("test") }}', data, caller);
			const duration = evaluator.evaluate('{{ Duration.invalid("test") }}', data, caller);
			const interval = evaluator.evaluate(
				'{{ Interval.fromDateTimes(DateTime.fromISO("2024-01-15"), DateTime.fromISO("2024-01-01")) }}',
				data,
				caller,
			);

			expect(dateTime).toBeInstanceOf(DateTime);
			expect((dateTime as DateTime).isValid).toBe(false);
			expect((dateTime as DateTime).invalidReason).toBe('test');
			expect(duration).toBeInstanceOf(Duration);
			expect((duration as Duration).isValid).toBe(false);
			expect((duration as Duration).invalidReason).toBe('test');
			expect(interval).toBeInstanceOf(Interval);
			expect((interval as Interval).isValid).toBe(false);
			expect((interval as Interval).invalidReason).toBe('end before start');
		});

		it('should keep a luxon value next to a user key that copies a marker name', () => {
			const data = { $json: {} };

			const result = evaluator.evaluate(
				'{{ ({ __n8nType: "x", real: DateTime.fromISO("2024-01-15") }) }}',
				data,
				caller,
			) as Record<string, unknown>;

			expect(result.__n8nType).toBe('x');
			expect(result.real).toBeInstanceOf(DateTime);
			expect((result.real as DateTime).isValid).toBe(true);
			expect((result.real as DateTime).toISODate()).toBe('2024-01-15');
		});

		it('should keep every key of a user object that copies an escape marker name', () => {
			const data = { $json: {} };

			expect(evaluator.evaluate('{{ ({ __n8nEscaped: true, keep: 1 }) }}', data, caller)).toEqual({
				__n8nEscaped: true,
				keep: 1,
			});
			expect(evaluator.evaluate('{{ ({ __n8nOpaque: true, keep: 1 }) }}', data, caller)).toEqual({
				__n8nOpaque: true,
				keep: 1,
			});
		});

		it('should keep a marker object that a class instance holds as plain data', () => {
			const data = { $json: {} };

			const result = evaluator.evaluate(
				'{{ (function(){ function Row(){ this.inner = { __n8nType: "DateTime", __isoString: "2024-01-15T00:00:00.000Z" }; this.a = { b: [{ __n8nType: "DateTime", __isoString: "2024-01-15T00:00:00.000Z" }] }; } return new Row(); })() }}',
				data,
				caller,
			);

			expect(result).toEqual({
				inner: { __n8nType: 'DateTime', __isoString: '2024-01-15T00:00:00.000Z' },
				a: { b: [{ __n8nType: 'DateTime', __isoString: '2024-01-15T00:00:00.000Z' }] },
			});
		});

		it('should rebuild a luxon value that appears in more than one place', () => {
			const data = { $json: {} };

			const result = evaluator.evaluate(
				'{{ (function(){ var d = DateTime.fromISO("2024-01-15T12:00:00.000Z"); return { a: d, b: [d] }; })() }}',
				data,
				caller,
			) as Record<string, unknown>;

			const first = result.a as DateTime;
			const second = (result.b as unknown[])[0] as DateTime;
			expect(DateTime.isDateTime(first)).toBe(true);
			expect(DateTime.isDateTime(second)).toBe(true);
			expect(second.toMillis()).toBe(first.toMillis());
		});

		// The QuickJS engine reads a result out of the sandbox with vm.dump(), which
		// fills the holes of a sparse array. A plain sparse array with no luxon value
		// in it loses its holes on that engine too, so the limit belongs to the
		// engine and not to the transfer.
		it.runIf(!isQuickJS)('should keep the holes of a sparse array that holds a luxon value', () => {
			const data = { $json: {} };

			const result = evaluator.evaluate(
				'{{ (function(){ var a = new Array(3); a[0] = DateTime.fromISO("2024-01-15T12:00:00.000Z"); a[2] = 3; return a; })() }}',
				data,
				caller,
			) as unknown[];

			expect(result).toHaveLength(3);
			expect(1 in result).toBe(false);
			expect(DateTime.isDateTime(result[0])).toBe(true);
			expect(result[2]).toBe(3);
		});

		it('should rebuild a luxon value under many levels of nesting', () => {
			const data = { $json: {} };
			const depth = 50;

			const result = evaluator.evaluate(
				`{{ (function(){ var v = DateTime.fromISO("2024-01-15T12:00:00.000Z"); for (var i = 0; i < ${depth}; i++) v = { down: v }; return v; })() }}`,
				data,
				caller,
			);

			let node: unknown = result;
			for (let i = 0; i < depth; i++) node = (node as Record<string, unknown>).down;
			expect(DateTime.isDateTime(node)).toBe(true);
		});

		it('should keep a marker that an error flag guards inside a class instance as data', () => {
			const data = { $json: {} };

			// An object carrying `__isError` sits inside a class instance, which the
			// host reads as data, so the key that names a type is the user's own and
			// must stay a string.
			const result = evaluator.evaluate(
				'{{ (function(){ function Row(){ this.m = { __isError: true, __n8nType: "DateTime", __isoString: "2024-01-15T00:00:00.000Z" }; } return new Row(); })() }}',
				data,
				caller,
			) as Record<string, unknown>;

			const marker = result.m as Record<string, unknown>;
			expect(DateTime.isDateTime(marker)).toBe(false);
			expect(marker.__n8nType).toBe('DateTime');
		});

		it('should return a class instance that contains itself', () => {
			const data = { $json: {} };

			const result = evaluator.evaluate(
				'{{ (function(){ function Row(){ this.n = 1; this.self = this; } return new Row(); })() }}',
				data,
				caller,
			) as Record<string, unknown>;

			expect(result.n).toBe(1);
			expect(result.self).toBe(result);
		});
	});

	describe('Date marshaling from workflow data', () => {
		it('should read a top-level or nested Date in $json as a Date, not {}', () => {
			const iso = '2026-06-30T20:34:04.498Z';
			const data = { $json: { d: new Date(iso), row: { createdAt: new Date(iso) } } };

			const top = evaluator.evaluate('{{ $json.d }}', data, caller);
			expect(top).not.toEqual({});
			expect(top).toBeInstanceOf(Date);
			expect((top as Date).toISOString()).toBe(iso);

			// nested (e.g. Data Table createdAt) travels the same getValueAtPath branch
			expect(evaluator.evaluate('{{ $json.row.createdAt }}', data, caller)).toBeInstanceOf(Date);
		});

		it('should read a Date array element in $json', () => {
			const data = { $json: { dates: [new Date('2026-06-30T20:34:04.498Z')] } };

			const result = evaluator.evaluate('{{ $json.dates[0] }}', data, caller);

			expect(result).toBeInstanceOf(Date);
		});
	});

	it('should enumerate keys that look like internal sentinel markers', () => {
		const data = { $json: { __NaN__: 'a', other: 'b' } };

		expect(evaluator.evaluate('{{ Object.keys($json).sort().join(",") }}', data, caller)).toBe(
			'__NaN__,other',
		);
	});

	it('should resolve a function array element as undefined', () => {
		const data = { $json: { items: [1, () => 2, 3] } };

		expect(evaluator.evaluate('{{ typeof $json.items[1] }}', data, caller)).toBe('undefined');
		expect(evaluator.evaluate('{{ $json.items[2] }}', data, caller)).toBe(3);
	});

	it('should round-trip Map, Set and NaN return values', () => {
		const data = { $json: {} };

		expect(evaluator.evaluate('{{ new Map([["a", 1]]) }}', data, caller)).toBeInstanceOf(Map);
		expect(evaluator.evaluate('{{ new Set([1, 2]) }}', data, caller)).toBeInstanceOf(Set);
		expect(evaluator.evaluate('{{ 0/0 }}', data, caller)).toBeNaN();
	});

	it('should keep undefined Map values and Set values', () => {
		const data = { $json: {} };

		expect(evaluator.evaluate('{{ new Map([["a", undefined]]) }}', data, caller)).toStrictEqual(
			new Map([['a', undefined]]),
		);
		expect(evaluator.evaluate('{{ new Set([undefined]) }}', data, caller)).toStrictEqual(
			new Set([undefined]),
		);
	});

	describe('self-referencing and shared values in Map, Set and Error', () => {
		const data = { $json: {} };

		it('should return a Map that holds itself as a value or a key', () => {
			const byValue = evaluator.evaluate(
				'{{ (() => { const m = new Map(); m.set("self", m); return m; })() }}',
				data,
				caller,
			) as Map<unknown, unknown>;
			const byKey = evaluator.evaluate(
				'{{ (() => { const m = new Map(); m.set(m, 1); return m; })() }}',
				data,
				caller,
			) as Map<unknown, unknown>;

			expect(byValue).toBeInstanceOf(Map);
			expect(byValue.get('self')).toBe(byValue);
			expect(byKey).toBeInstanceOf(Map);
			expect(byKey.get(byKey)).toBe(1);
		});

		it('should return a Set that holds itself', () => {
			const result = evaluator.evaluate(
				'{{ (() => { const s = new Set(); s.add(s); return s; })() }}',
				data,
				caller,
			) as Set<unknown>;

			expect(result).toBeInstanceOf(Set);
			expect(result.size).toBe(1);
			expect(result.has(result)).toBe(true);
		});

		it('should return a Map or a Set that holds a self-referencing object or array', () => {
			const mapObj = evaluator.evaluate(
				'{{ (() => { const o = { a: 1 }; o.self = o; return new Map([["k", o]]); })() }}',
				data,
				caller,
			) as Map<string, Record<string, unknown>>;
			const mapArr = evaluator.evaluate(
				'{{ (() => { const a = [1]; a.push(a); return new Map([["k", a]]); })() }}',
				data,
				caller,
			) as Map<string, unknown[]>;
			const setObj = evaluator.evaluate(
				'{{ (() => { const o = { a: 1 }; o.self = o; return new Set([o]); })() }}',
				data,
				caller,
			) as Set<Record<string, unknown>>;
			const setArr = evaluator.evaluate(
				'{{ (() => { const a = [1]; a.push(a); return new Set([a]); })() }}',
				data,
				caller,
			) as Set<unknown[]>;

			const mo = mapObj.get('k')!;
			expect(mo.a).toBe(1);
			expect(mo.self).toBe(mo);

			const ma = mapArr.get('k')!;
			expect(ma[0]).toBe(1);
			expect(ma[1]).toBe(ma);

			const [so] = [...setObj];
			expect(so.a).toBe(1);
			expect(so.self).toBe(so);

			const [sa] = [...setArr];
			expect(sa[0]).toBe(1);
			expect(sa[1]).toBe(sa);
		});

		it('should return mutually referencing Map and Set instances', () => {
			const result = evaluator.evaluate(
				'{{ (() => { const m = new Map(); const s = new Set([m]); m.set("s", s); return m; })() }}',
				data,
				caller,
			) as Map<string, Set<unknown>>;

			expect(result).toBeInstanceOf(Map);
			const inner = result.get('s');
			expect(inner).toBeInstanceOf(Set);
			expect(inner?.has(result)).toBe(true);
		});

		it('should return a Map whose key refers back to the Map and is also its value', () => {
			const result = evaluator.evaluate(
				'{{ (() => { const m = new Map(); const k = { a: 1 }; k.m = m; m.set(k, k); return m; })() }}',
				data,
				caller,
			) as Map<Record<string, unknown>, Record<string, unknown>>;

			const [[key, value]] = [...result.entries()];
			expect(key).toBe(value);
			expect(key.a).toBe(1);
			expect(key.m).toBe(result);
		});

		it('should return an Error that holds a self-referencing Map, Set, or object inside a Map', () => {
			const errWithMap = evaluator.evaluate(
				'{{ (() => { const e = new Error("x"); const m = new Map([["e", e]]); e.m = m; return e; })() }}',
				data,
				caller,
			) as Error & { m: Map<string, unknown> };
			const errWithSet = evaluator.evaluate(
				'{{ (() => { const e = new Error("x"); const s = new Set(); s.add(s); e.s = s; return e; })() }}',
				data,
				caller,
			) as Error & { s: Set<unknown> };
			const errWithMapObj = evaluator.evaluate(
				'{{ (() => { const e = new Error("x"); const o = { a: 1 }; o.self = o; e.m = new Map([["o", o]]); return e; })() }}',
				data,
				caller,
			) as Error & { m: Map<string, Record<string, unknown>> };

			expect(errWithMap).toBeInstanceOf(Error);
			expect(errWithMap.message).toBe('x');
			expect(errWithMap.m).toBeInstanceOf(Map);
			expect(errWithMap.m.get('e')).toBeInstanceOf(Error);

			expect(errWithSet).toBeInstanceOf(Error);
			expect(errWithSet.s).toBeInstanceOf(Set);
			expect(errWithSet.s.has(errWithSet.s)).toBe(true);

			const nested = errWithMapObj.m.get('o')!;
			expect(nested.a).toBe(1);
			expect(nested.self).toBe(nested);
		});

		it('should return a Map or a Set that holds a self-referencing Error', () => {
			const mapWithSelfErr = evaluator.evaluate(
				'{{ (() => { const e = new Error("x"); e.self = e; return new Map([["e", e]]); })() }}',
				data,
				caller,
			) as Map<string, Error>;
			const mapWithMutualErr = evaluator.evaluate(
				'{{ (() => { const m = new Map(); const e = new Error("x"); e.m = m; m.set("e", e); return m; })() }}',
				data,
				caller,
			) as Map<string, Error>;
			const setWithSelfErr = evaluator.evaluate(
				'{{ (() => { const e = new Error("x"); e.self = e; return new Set([e]); })() }}',
				data,
				caller,
			) as Set<Error>;

			expect(mapWithSelfErr.get('e')).toBeInstanceOf(Error);
			expect(mapWithSelfErr.get('e')?.message).toBe('x');
			expect(mapWithMutualErr.get('e')).toBeInstanceOf(Error);
			expect(mapWithMutualErr.get('e')?.message).toBe('x');
			const [setErr] = [...setWithSelfErr];
			expect(setErr).toBeInstanceOf(Error);
			expect(setErr.message).toBe('x');
		});

		it('should return a class instance in a cycle with a Map', () => {
			const mapWithClass = evaluator.evaluate(
				'{{ (() => { class C { constructor() { this.n = 1; this.self = this; } } return new Map([["c", new C()]]); })() }}',
				data,
				caller,
			) as Map<string, Record<string, unknown>>;
			const classWithMap = evaluator.evaluate(
				'{{ (() => { class C { constructor() { const m = new Map(); m.set("c", this); this.m = m; } } return new C(); })() }}',
				data,
				caller,
			) as { m: Map<string, unknown> };

			const c = mapWithClass.get('c')!;
			expect(c.n).toBe(1);
			expect(c.self).toBe(c);
			expect(classWithMap.m).toBeInstanceOf(Map);
			expect(classWithMap.m.get('c')).toBe(classWithMap);
		});

		it('should keep shared references inside a Map or an Error', () => {
			const sharedInMap = evaluator.evaluate(
				'{{ (() => { const o = { a: 1 }; const d = new Date(0); const s = new String("ab"); return new Map([["o1", o], ["o2", o], ["d1", d], ["d2", d], ["s1", s], ["s2", s]]); })() }}',
				data,
				caller,
			) as Map<string, unknown>;
			const sharedInError = evaluator.evaluate(
				'{{ (() => { const o = { a: 1 }; return Object.assign(new Error("x", { cause: o }), { a: o, b: o, toJSON: () => o }); })() }}',
				data,
				caller,
			) as Error & { a: unknown; b: unknown; toJSON: () => unknown };

			expect(sharedInMap.get('o1')).toBe(sharedInMap.get('o2'));
			expect(sharedInMap.get('d1')).toBeInstanceOf(Date);
			expect(sharedInMap.get('d1')).toBe(sharedInMap.get('d2'));
			expect(sharedInMap.get('s1')).toBeInstanceOf(String);
			expect(sharedInMap.get('s1')).toBe(sharedInMap.get('s2'));
			expect((sharedInMap.get('s1') as { valueOf(): string }).valueOf()).toBe('ab');
			expect(sharedInError.a).toBe(sharedInError.b);
			expect(sharedInError.cause).toBe(sharedInError.a);
			expect(sharedInError.toJSON()).toBe(sharedInError.a);
		});

		it('should preserve user keys that match ref markers next to cycles', () => {
			const result = evaluator.evaluate(
				'{{ (() => { const o = { __isRef: true, __id: 0, __isRefDef: true, __value: "user" }; o.self = o; return new Map([["k", o]]); })() }}',
				data,
				caller,
			) as Map<string, Record<string, unknown>>;

			const entry = result.get('k')!;
			expect(entry.__isRef).toBe(true);
			expect(entry.__id).toBe(0);
			expect(entry.__isRefDef).toBe(true);
			expect(entry.__value).toBe('user');
			expect(entry.self).toBe(entry);

			const boxedMarkerCycle = evaluator.evaluate(
				'{{ (() => { const o = { __isBoxedPrimitive: "string", __value: new String("real") }; o.self = o; return new Map([["k", o]]); })() }}',
				data,
				caller,
			) as Map<string, Record<string, unknown>>;
			const boxedEntry = boxedMarkerCycle.get('k')!;
			expect(boxedEntry.__isBoxedPrimitive).toBe('string');
			expect(boxedEntry.__value).toBeInstanceOf(String);
			expect((boxedEntry.__value as { valueOf(): string }).valueOf()).toBe('real');
			expect(boxedEntry.self).toBe(boxedEntry);

			const escapedFlagOnBoxed = evaluator.evaluate(
				'{{ Object.assign(new String("ab"), { __n8nEscaped: true, __value: { fake: 1 } }) }}',
				data,
				caller,
			);
			expect(escapedFlagOnBoxed).toBeInstanceOf(String);
			expect((escapedFlagOnBoxed as { valueOf(): string }).valueOf()).toBe('ab');
		});

		it('should round-trip cyclic Map, Set and Error values from host-call data', () => {
			const selfMap = new Map<string, unknown>();
			selfMap.set('self', selfMap);
			const selfSet = new Set<unknown>();
			selfSet.add(selfSet);
			const cycObj: Record<string, unknown> = { a: 1 };
			cycObj.self = cycObj;
			const mapWithObj = new Map([['k', cycObj]]);
			const errWithMap = Object.assign(new Error('from host'), {
				m: new Map<string, unknown>(),
			});
			errWithMap.m.set('e', errWithMap);
			const json = { selfMap, selfSet, mapWithObj, errWithMap, marker: { __isRef: true, __id: 0 } };
			const hostData = { $json: json, $input: { first: () => ({ json }) } };

			const outMap = evaluator.evaluate(
				'{{ $input.first().json.selfMap }}',
				hostData,
				caller,
			) as Map<string, unknown>;
			const outSet = evaluator.evaluate(
				'{{ $input.first().json.selfSet }}',
				hostData,
				caller,
			) as Set<unknown>;
			const outMapObj = evaluator.evaluate(
				'{{ $input.first().json.mapWithObj }}',
				hostData,
				caller,
			) as Map<string, Record<string, unknown>>;
			const outErr = evaluator.evaluate('{{ $json.errWithMap }}', hostData, caller) as Error & {
				m: Map<string, unknown>;
			};
			const outMarker = evaluator.evaluate('{{ $input.first().json.marker }}', hostData, caller);

			expect(outMap).toBeInstanceOf(Map);
			expect(outMap.get('self')).toBe(outMap);
			expect(outSet).toBeInstanceOf(Set);
			expect(outSet.has(outSet)).toBe(true);
			expect(outMapObj.get('k')).toBeDefined();
			expect(outMapObj.get('k')?.self).toBe(outMapObj.get('k'));
			expect(outErr).toBeInstanceOf(Error);
			expect(outErr.message).toBe('from host');
			expect(outErr.m).toBeInstanceOf(Map);
			expect(outMarker).toStrictEqual({ __isRef: true, __id: 0 });
		});

		it('should keep fields on mutually referencing Errors returned at separate positions', () => {
			const mutual = evaluator.evaluate(
				'{{ (() => { const a = new Error("a"); const b = new Error("b"); a.child = b; b.parent = a; return [a, b]; })() }}',
				data,
				caller,
			) as [Error & { child?: Error }, Error & { parent?: Error }];
			const causeLoop = evaluator.evaluate(
				'{{ (() => { const c = new Error("c"); const e = new Error("e", { cause: c }); c.back = e; return [e, c]; })() }}',
				data,
				caller,
			) as [Error & { cause?: Error }, Error & { back?: Error }];

			expect(mutual[0].child).toBeInstanceOf(Error);
			expect(mutual[0].child?.message).toBe('b');
			expect(mutual[1].parent).toBeInstanceOf(Error);
			expect(mutual[1].parent?.message).toBe('a');

			expect(causeLoop[0].cause).toBeInstanceOf(Error);
			expect(causeLoop[0].cause?.message).toBe('c');
			expect(causeLoop[1].back).toBeInstanceOf(Error);
			expect(causeLoop[1].back?.message).toBe('e');
		});

		it('should report a guest stack error and stay healthy when a cyclic plain value is extracted from a host Map or Set', () => {
			const cycObj: Record<string, unknown> = { a: 1 };
			cycObj.self = cycObj;
			const cycArr: unknown[] = [1];
			cycArr.push(cycArr);
			const json = {
				mapWithObj: new Map<string, unknown>([['k', cycObj]]),
				setWithArr: new Set<unknown>([cycArr]),
			};
			const hostData = { $input: { first: () => ({ json }) } };

			expect(() =>
				evaluator.evaluate('{{ $input.first().json.mapWithObj.get("k") }}', hostData, caller),
			).toThrow(/Maximum call stack size exceeded/);
			expect(evaluator.evaluate('{{ 1 + 1 }}', data, caller)).toBe(2);

			expect(() =>
				evaluator.evaluate('{{ [...$input.first().json.setWithArr][0] }}', hostData, caller),
			).toThrow(/Maximum call stack size exceeded/);
			expect(evaluator.evaluate('{{ 2 + 2 }}', data, caller)).toBe(4);
		});
	});

	it('should honor locale and options in toLocaleString/toLocaleTimeString', () => {
		const data = { $json: { n: 1234.5, iso: '2024-01-15T10:30:00.000Z' } };

		expect(
			evaluator.evaluate(
				'{{ $json.n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}',
				data,
				caller,
			),
		).toBe('1,234.50');
		expect(
			evaluator.evaluate(
				'{{ new Date($json.iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }) }}',
				data,
				caller,
			),
		).toBe('10:30 AM');
	});

	describe('returned Error fields', () => {
		it.each(['detail', 'toJSON'])(
			'should return the original Error when a hidden %s getter throws',
			async (key) => {
				const bridge = createBridge();
				await bridge.initialize();
				try {
					const result = bridge.execute(
						`return Object.defineProperties(new TypeError('original'), {
							${key}: { get() { throw new RangeError('getter failed'); } },
							code: { value: 400 }
						});`,
						{},
					) as Error;

					expect(result).toBeInstanceOf(TypeError);
					expect(result.message).toBe('original');
					expect(Object.hasOwn(result, key)).toBe(false);
					expect(Object.getOwnPropertyDescriptor(result, 'code')).toMatchObject({
						value: 400,
						enumerable: false,
					});
				} finally {
					await bridge.dispose();
				}
			},
		);

		it.each([
			{ label: 'function', expression: '() => 1' },
			{ label: 'Promise', expression: '(async () => 1)()' },
			{ label: 'symbol', expression: 'Symbol("detail")' },
		])('should omit a $label from an Error', ({ expression }) => {
			for (const nested of [false, true]) {
				const result = evaluator.evaluate(
					`{{ (() => {
						const value = ${expression};
						const detail = ${nested ? '{ code: 400, values: [value, { value }] }' : 'value'};
						return Object.assign(new TypeError('original', { cause: detail }), {
							code: 400, detail, toJSON: () => detail
						});
					})() }}`,
					{ $json: {} },
					caller,
				) as Error & { code: number; detail: unknown; toJSON: () => unknown };
				const expected = nested
					? { code: 400, values: [undefined, { value: undefined }] }
					: undefined;

				expect(result).toBeInstanceOf(TypeError);
				expect(result.message).toBe('original');
				expect(result.code).toBe(400);
				expect(result.detail).toStrictEqual(expected);
				expect(result.cause).toStrictEqual(expected);
				expect(result.toJSON()).toStrictEqual(expected);
			}
		});

		it('should keep non-enumerable custom fields', async () => {
			const bridge = createBridge();
			await bridge.initialize();
			try {
				// Expressions cannot call defineProperties. Set up the fields in the guest directly.
				const result = bridge.execute(
					`return Object.defineProperties(new TypeError('original'), {
						code: { value: 400 },
						detail: { value: new Error('inner') },
						visible: { value: true, enumerable: true }
					});`,
					{},
				) as Error & { detail: Error };

				expect(result).toBeInstanceOf(TypeError);
				expect(Object.getOwnPropertyDescriptor(result, 'code')).toMatchObject({
					value: 400,
					enumerable: false,
				});
				expect(result.detail).toBeInstanceOf(Error);
				expect(result.detail.message).toBe('inner');
				expect(Object.keys(result)).toEqual(['visible']);
				expect(JSON.stringify(result)).toBe('{"visible":true}');
			} finally {
				await bridge.dispose();
			}
		});
	});

	it('should throw when the result cannot be cloned (function or Promise)', () => {
		const data = { $json: {} };

		expect(() => evaluator.evaluate('{{ async () => 1 }}', data, caller)).toThrow(
			'could not be cloned',
		);
		expect(() => evaluator.evaluate('{{ (async () => 1)() }}', data, caller)).toThrow(
			'could not be cloned',
		);
		expect(() => evaluator.evaluate('{{ ({ fn: () => 1 }) }}', data, caller)).toThrow(
			'could not be cloned',
		);
		expect(() => evaluator.evaluate('{{ ({ task: (async () => 1)() }) }}', data, caller)).toThrow(
			'could not be cloned',
		);
	});

	it('should reject the opposite style option in toLocaleDateString/toLocaleTimeString', () => {
		const data = { $json: {} };

		// The in-sandbox TypeError is swallowed by the E() handler, so the
		// expression yields undefined — same as the vm engine.
		expect(
			evaluator.evaluate(
				'{{ new Date(0).toLocaleDateString("en-US", { timeStyle: "short" }) }}',
				data,
				caller,
			),
		).toBeUndefined();
		expect(
			evaluator.evaluate(
				'{{ new Date(0).toLocaleTimeString("en-US", { dateStyle: "short" }) }}',
				data,
				caller,
			),
		).toBeUndefined();
		expect(
			evaluator.evaluate(
				'{{ new Date(0).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }) }}',
				data,
				caller,
			),
		).toBe('1/1/70, 12:00 AM');
	});

	it('should support unbound Intl format and construction-time options snapshot', () => {
		const data = { $json: {} };

		// V8 exposes format as a bound-function getter, so it must work unbound.
		expect(
			evaluator.evaluate(
				'{{ [new Date(0), new Date(86400000)].map(new Intl.DateTimeFormat("en-US", { timeZone: "UTC" }).format).join("|") }}',
				data,
				caller,
			),
		).toBe('1/1/1970|1/2/1970');

		// V8 snapshots options at construction; later mutation must not change output.
		expect(
			evaluator.evaluate(
				'{{ (() => { var o = { minimumFractionDigits: 2, maximumFractionDigits: 2 }; var nf = new Intl.NumberFormat("en-US", o); o.minimumFractionDigits = 5; o.maximumFractionDigits = 5; return nf.format(1); })() }}',
				data,
				caller,
			),
		).toBe('1.00');
	});

	it('should delegate Collator, PluralRules, DisplayNames and Intl statics to host Intl', () => {
		const data = { $json: {} };

		expect(evaluator.evaluate('{{ new Intl.PluralRules("en-US").select(1) }}', data, caller)).toBe(
			'one',
		);
		expect(
			evaluator.evaluate('{{ new Intl.Collator("en-US").compare("a", "b") }}', data, caller),
		).toBe(-1);
		expect(
			evaluator.evaluate(
				'{{ new Intl.DisplayNames(["en"], { type: "region" }).of("DE") }}',
				data,
				caller,
			),
		).toBe('Germany');
		expect(evaluator.evaluate('{{ Intl.getCanonicalLocales("EN-us")[0] }}', data, caller)).toBe(
			'en-US',
		);
		expect(
			evaluator.evaluate(
				'{{ Intl.supportedValuesOf("calendar").includes("gregory") }}',
				data,
				caller,
			),
		).toBe(true);
	});

	it('should expose real Intl.Locale properties including weekInfo', () => {
		const data = { $json: {} };

		expect(evaluator.evaluate('{{ new Intl.Locale("de-DE").language }}', data, caller)).toBe('de');
		expect(evaluator.evaluate('{{ new Intl.Locale("de-DE").baseName }}', data, caller)).toBe(
			'de-DE',
		);
		// Luxon reads getWeekInfo() where present, the weekInfo getter otherwise —
		// both engines report ISO first day 1 (Monday) for de-DE.
		expect(
			evaluator.evaluate(
				'{{ (l => ("getWeekInfo" in l ? l.getWeekInfo() : l.weekInfo).firstDay)(new Intl.Locale("de-DE")) }}',
				data,
				caller,
			),
		).toBe(1);
	});

	it('should round-trip an invalid Date return value', () => {
		const data = { $json: {} };

		const result = evaluator.evaluate('{{ new Date("not-a-date") }}', data, caller);
		expect(result).toBeInstanceOf(Date);
		expect(Number.isNaN((result as Date).getTime())).toBe(true);
	});

	it('should return user objects whose keys collide with transfer markers unchanged', () => {
		const data = { $json: {} };

		expect(
			evaluator.evaluate('{{ ({ __isDate: true, __isoString: "x" }) }}', data, caller),
		).toEqual({ __isDate: true, __isoString: 'x' });
		expect(evaluator.evaluate('{{ ({ __isMap: true, __entries: [] }) }}', data, caller)).toEqual({
			__isMap: true,
			__entries: [],
		});
		expect(evaluator.evaluate('{{ ({ __isNaN: true }) }}', data, caller)).toEqual({
			__isNaN: true,
		});
		expect(evaluator.evaluate('{{ ({ __isUndefined: true }) }}', data, caller)).toEqual({
			__isUndefined: true,
		});
		expect(
			evaluator.evaluate('{{ ({ nested: { __isSet: true, __values: [1] } }) }}', data, caller),
		).toEqual({ nested: { __isSet: true, __values: [1] } });
		expect(evaluator.evaluate('{{ ({ __isEscaped: true, __value: 1 }) }}', data, caller)).toEqual({
			__isEscaped: true,
			__value: 1,
		});
		expect(evaluator.evaluate('{{ ({ __isRef: true, __id: 0 }) }}', data, caller)).toEqual({
			__isRef: true,
			__id: 0,
		});
		expect(
			evaluator.evaluate('{{ ({ __isRefDef: true, __id: 0, __value: 1 }) }}', data, caller),
		).toEqual({
			__isRefDef: true,
			__id: 0,
			__value: 1,
		});
		expect(
			evaluator.evaluate(
				'{{ ({ __isBoxedPrimitive: "bigint", __value: "not-a-bigint" }) }}',
				data,
				caller,
			),
		).toEqual({
			__isBoxedPrimitive: 'bigint',
			__value: 'not-a-bigint',
		});
		const mixed = evaluator.evaluate(
			'{{ ({ __isBoxedPrimitive: "string", __value: new String("real") }) }}',
			data,
			caller,
		) as { __isBoxedPrimitive: string; __value: unknown };
		expect(mixed.__isBoxedPrimitive).toBe('string');
		expect(mixed.__value).toBeInstanceOf(String);
		expect((mixed.__value as { valueOf(): string }).valueOf()).toBe('real');
	});

	it('should keep an __isUndefined key on a class instance property that also has __isError', () => {
		const data = { $json: {} };
		const fromClass = (property: string) =>
			`{{ (() => { class C { constructor() { this.x = ${property}; } } return new C(); })() }}`;

		expect(
			evaluator.evaluate(fromClass('{ __isError: true, __isUndefined: true }'), data, caller),
		).toEqual({ x: { __isError: true, __isUndefined: true } });
		expect(evaluator.evaluate(fromClass('undefined'), data, caller)).toStrictEqual({
			x: undefined,
		});
	});

	it('should throw on invalid timezone', async () => {
		const data = { $json: { x: 1 } };

		expect(() =>
			evaluator.evaluate('{{ $json.x }}', data, caller, { timezone: 'Not/A/Timezone' }),
		).toThrow('Invalid timezone: "Not/A/Timezone"');
	});

	it('should create $now with the provided timezone', async () => {
		const data = { $json: {} };

		const zone = evaluator.evaluate('{{ $now.zoneName }}', data, caller, {
			timezone: 'America/New_York',
		});

		expect(zone).toBe('America/New_York');
	});

	it('should create $today with the provided timezone', async () => {
		const data = { $json: {} };

		const zone = evaluator.evaluate('{{ $today.zoneName }}', data, caller, {
			timezone: 'Asia/Tokyo',
		});

		expect(zone).toBe('Asia/Tokyo');
	});

	it('should reset to system timezone when no timezone is provided after one was set', async () => {
		const data = {
			$json: { ts: 1704067200000 }, // 2024-01-01T00:00:00Z
		};

		// Capture the system default offset before any timezone is set
		const systemOffset = evaluator.evaluate(
			'{{ DateTime.fromMillis($json.ts).toFormat("ZZ") }}',
			data,
			caller,
		);

		// Evaluate with explicit timezone (changes Settings.defaultZone)
		evaluator.evaluate('{{ DateTime.fromMillis($json.ts).toFormat("HH:mm ZZ") }}', data, caller, {
			timezone: 'Asia/Tokyo',
		});

		// Evaluate WITHOUT timezone — should reset to system default, not keep Tokyo
		const result = evaluator.evaluate(
			'{{ DateTime.fromMillis($json.ts).toFormat("ZZ") }}',
			data,
			caller,
		);

		expect(result).toBe(systemOffset);
	});

	it('should support Object.keys() on root proxy data', () => {
		const data = {
			$json: { name: 'Alice', age: 30, city: 'Berlin' },
		};

		const result = evaluator.evaluate('{{ Object.keys($json).join(",") }}', data, caller);

		expect(result).toBe('name,age,city');
	});

	it('should not leak host references through non-index array access', () => {
		// Reading a non-index key like $json.a.constructor must return undefined,
		// so a guest can't walk from an array to the host Object prototype.
		const data = { $json: { a: [1337] } };
		const expression = `{{
  (function() {
    const hostLookupParams = (() => eval)()(\`(args, res) => {
      const _copy = {copy: true};
      const _reference = {reference: true};
      const params = {};
      params.arguments = args === 'copy' ? _copy : _reference;
      params.result = res === 'copy' ? _copy : _reference;
      return params;
    }\`);
    const refs = (() => eval)()(\`
(function () { return arguments.callee.caller.caller.caller.arguments })()
\`);
    const getArrayElement = refs[1];

    var log = [];

    function t(label, fn) {
      try {
        const result = fn();
        log.push(label + '=' + result);
        return result;
      } catch (e) {
        log.push(label + ':ERR ' + String(e && e.message ? e.message : e));
      }
    }

    const hostArrayPath = ['$json', 'a'];
    const HostArray = t('host array', function() {
      return getArrayElement.applySync(null, [hostArrayPath, 'constructor'], hostLookupParams('copy', 'reference'));
    });
    const HostLookupGetter = t('host lookup getter', function() {
      return getArrayElement.applySync(null, [hostArrayPath, '__lookupGetter__'], hostLookupParams('copy', 'reference'));
    });
    const hostArrayInstance = t('host array instance', function() {
      return HostArray.applySync(null, [1], hostLookupParams('copy', 'reference'));
    });
    const HostProtoGetter = t('host __proto__ getter', function() {
      return HostLookupGetter.applySync(hostArrayInstance.derefInto(), ['__proto__'], hostLookupParams('copy', 'reference'));
    });
    const arrProto = t('host Array prototype', function() {
      return HostProtoGetter.applySync(hostArrayInstance.derefInto(), [], hostLookupParams('copy', 'reference'));
    });
    const objProto = t('host Object prototype', function() {
      return HostProtoGetter.applySync(arrProto.derefInto(), [], hostLookupParams('copy', 'reference'));
    });

    objProto.setSync('win', 1337);
    return log;
  })();
}}`;

		try {
			// The bridge swallows the TypeError; what matters is the host Object
			// prototype was never mutated.
			evaluator.evaluate(expression, data, caller);
			expect((Object.prototype as Record<string, unknown>).win).toBeUndefined();
		} finally {
			delete (Object.prototype as Record<string, unknown>).win;
		}
	});

	it('should preserve error name, message, and custom properties across isolate boundary', () => {
		const data = { $json: {} };

		// Throw a plain Error with a name the bridge recognizes and custom
		// properties. The bridge serializes via __reportError, reconstructs
		// on the host, and re-throws — name, message, and extra properties
		// should survive the round-trip.
		const expression =
			'{{ (() => {' +
			'  const e = new Error("test error");' +
			'  e.name = "ExpressionExtensionError";' +
			'  e.customProp = "hello";' +
			'  e.context = { foo: "bar" };' +
			'  throw e;' +
			'})() }}';

		expect(() => evaluator.evaluate(expression, data, caller)).toThrow(
			expect.objectContaining({
				name: 'ExpressionExtensionError',
				message: 'test error',
				customProp: 'hello',
				context: { foo: 'bar' },
			}),
		);
	});

	it('should handle throw null without crashing', () => {
		const data = { $json: {} };
		expect(evaluator.evaluate('{{ (() => { throw null })() }}', data, caller)).toBeUndefined();
	});

	it('should handle throw undefined without crashing', () => {
		const data = { $json: {} };
		expect(evaluator.evaluate('{{ (() => { throw undefined })() }}', data, caller)).toBeUndefined();
	});

	it('should handle throw of null-prototype object with properties without crashing', () => {
		const data = { $json: {} };
		expect(
			evaluator.evaluate(
				'{{ (() => { var e = Object.create(null); e.foo = "bar"; throw e; })() }}',
				data,
				caller,
			),
		).toBeUndefined();
	});

	it('should handle throw of object with hasOwnProperty shadowed by null without crashing', () => {
		const data = { $json: {} };
		expect(
			evaluator.evaluate(
				'{{ (() => { throw { hasOwnProperty: null, foo: "bar" }; })() }}',
				data,
				caller,
			),
		).toBeUndefined();
	});

	it('should swallow TypeError and return undefined', () => {
		const data = { $json: {} };

		// E() inside the isolate swallows TypeErrors (failed attack attempts).
		// The expression should return undefined, not throw.
		const result = evaluator.evaluate(
			'{{ (() => { throw new TypeError("test") })() }}',
			data,
			caller,
		);

		expect(result).toBeUndefined();
	});

	it('should re-throw ExpressionError from host-side callbacks', () => {
		const json = {
			get brokenProp() {
				const err = new Error('paired item failed');
				err.name = 'ExpressionError';
				throw err;
			},
		};

		expect(() => evaluator.evaluate('{{ $json.brokenProp }}', { $json: json }, caller)).toThrow(
			expect.objectContaining({ name: 'ExpressionError', message: 'paired item failed' }),
		);
	});

	it('should re-throw ExpressionExtensionError from host-side callbacks', () => {
		const json = {
			get brokenProp() {
				const err = new Error('extension failed');
				err.name = 'ExpressionExtensionError';
				throw err;
			},
		};

		expect(() => evaluator.evaluate('{{ $json.brokenProp }}', { $json: json }, caller)).toThrow(
			expect.objectContaining({
				name: 'ExpressionExtensionError',
				message: 'extension failed',
			}),
		);
	});

	it('should swallow generic errors thrown when reading a property across the isolate boundary', () => {
		const json = {
			get brokenProp() {
				throw new Error('property access failed');
			},
		};

		expect(evaluator.evaluate('{{ $json.brokenProp }}', { $json: json }, caller)).toBeUndefined();
	});

	it('should swallow generic errors thrown by functions accessed via the lazy proxy', () => {
		const data = {
			$json: {
				myFn() {
					throw new Error('function threw');
				},
			},
		};

		expect(evaluator.evaluate('{{ $json.myFn() }}', data, caller)).toBeUndefined();
	});

	it('should swallow generic errors from $items() when result properties are accessed', () => {
		const data = {
			$items() {
				throw new Error('items failed');
			},
		};

		expect(evaluator.evaluate('{{ $items().length }}', data, caller)).toBeUndefined();
	});

	it('should swallow generic errors thrown during array element access across the isolate boundary', () => {
		const items = [1, 2, 3];
		Object.defineProperty(items, '0', {
			get() {
				throw new Error('element access failed');
			},
			configurable: true,
			enumerable: true,
		});

		const data = { $json: { items } };

		expect(evaluator.evaluate('{{ $json.items[0] }}', data, caller)).toBeUndefined();
	});

	it('should swallow generic errors thrown during an "in" operator check across the isolate boundary', () => {
		const json = {
			get brokenProp() {
				throw new Error('in-check access failed');
			},
		};

		// The 'in' operator triggers the has trap on $json proxy.
		// The bridge calls __getValueAtPath(['$json', 'brokenProp']) which throws.
		expect(
			evaluator.evaluate('{{ "brokenProp" in $json }}', { $json: json }, caller),
		).toBeUndefined();
	});

	it('should preserve the outer data bindings after a re-entrant execute() call', () => {
		const data = {
			$json: {
				get nested() {
					// Re-enters execute() on the same bridge with different data.
					// The outer evaluation must keep resolving against its own data
					// after the nested call returns.
					return evaluator.evaluate('{{ "inner" }}', { $json: { val: 1 } }, caller);
				},
				other: 'OUTER_VALUE',
			},
		};

		expect(evaluator.evaluate('{{ $json.nested + "|" + $json.other }}', data, caller)).toBe(
			'inner|OUTER_VALUE',
		);
	});

	describe('host value reads', () => {
		const rows = [
			{ id: 1, tags: ['a', 'b'] },
			{ id: 2, tags: ['c'] },
		];

		it('reads a host getter once when the guest copies its whole value', () => {
			const read = vi.fn(() => ({ rows, count: rows.length }));
			const data = {
				get $json() {
					return read();
				},
			};

			expect(evaluator.evaluate('{{ $json }}', data, caller)).toEqual({ rows, count: 2 });
			expect(read).toHaveBeenCalledTimes(1);
		});

		it('recreates an evicted $item() result when copying a lazy value', () => {
			const item = vi.fn((index: number) => ({ $json: { index, rows } }));
			const node = vi.fn((name: string) => ({ json: { name, rows } }));
			const data = { $item: item, $: node } as unknown as WorkflowData;

			expect(
				evaluator.evaluate(
					'{{ [$item(0).$json.rows, $item(0).$json.index, $item(1).$json.index, $("A").json.rows, $("A").json.name] }}',
					data,
					caller,
				),
			).toEqual([rows, 0, 1, rows, 'A']);
			// Copying the returned rows reads item 0 again after item 1.
			expect(item.mock.calls).toEqual([[0], [1], [0]]);
			expect(node.mock.calls).toEqual([['A']]);
		});

		it('reads the host data again in the next evaluation', () => {
			let current = 'first';
			const data = {
				get $json() {
					return { value: current };
				},
			};

			expect(evaluator.evaluate('{{ $json.value }}', data, caller)).toBe('first');
			current = 'second';
			expect(evaluator.evaluate('{{ $json.value }}', data, caller)).toBe('second');
		});

		it('reads a getter again after it threw', () => {
			let attempts = 0;
			const data = {
				$json: {
					get flaky() {
						attempts++;
						if (attempts === 1) throw new Error('not ready');
						return 'ready';
					},
				},
			};

			expect(
				evaluator.evaluate(
					'{{ (() => { try { return $json.flaky; } catch (e) { return $json.flaky; } })() }}',
					data,
					caller,
				),
			).toBe('ready');
			expect(attempts).toBe(2);
		});
	});

	describe('concat of workflow data arrays', () => {
		const data = { $json: { list: [1, [2, 3], { id: 4 }], other: ['a'] } };

		it.each([
			['{{ $json.list.concat($json.other) }}', [1, [2, 3], { id: 4 }, 'a']],
			['{{ [0].concat($json.list, 9, $json.other) }}', [0, 1, [2, 3], { id: 4 }, 9, 'a']],
			['{{ $json.list.concat() }}', [1, [2, 3], { id: 4 }]],
			['{{ $json.list[1].concat($json.list[2]) }}', [2, 3, { id: 4 }]],
			['{{ [].concat.length }}', 1],
			['{{ [].concat.name }}', 'concat'],
			['{{ $json.other.concat("b", [["c"]]) }}', ['a', 'b', ['c']]],
			[
				'{{ (() => { const list = $json.list; list.push(5); return list.concat($json.other); })() }}',
				[1, [2, 3], { id: 4 }, 5, 'a'],
			],
			[
				'{{ (() => { const list = $json.other; list[Symbol.isConcatSpreadable] = false; return [0].concat(list).length; })() }}',
				2,
			],
			[
				'{{ (() => { const list = $json.other; list.constructor = { [Symbol.species]: function () { return { tag: "mine" }; } }; return list.concat("b").tag; })() }}',
				'mine',
			],
			[
				'{{ (() => { const list = $json.list; list[Symbol.isConcatSpreadable] = true; return list.concat($json.other, 9); })() }}',
				[1, [2, 3], { id: 4 }, 'a', 9],
			],
			[
				'{{ $json.list.concat({ length: 1, 0: "x", [Symbol.isConcatSpreadable]: true }) }}',
				[1, [2, 3], { id: 4 }, 'x'],
			],
			['{{ $json.other.concat(null, [null]) }}', ['a', null, null]],
			[
				'{{ $json.other.concat({ length: 1.5, 0: 7, 1: 8, [Symbol.isConcatSpreadable]: true }) }}',
				['a', 7],
			],
			[
				'{{ (() => { const later = [7, 8]; const first = [0]; first.__defineGetter__(0, () => { later[Symbol.isConcatSpreadable] = false; return 0; }); return first.concat($json.other, later); })() }}',
				[0, 'a', [7, 8]],
			],
			['{{ Array.isArray($json.list.concat($json.other)) }}', true],
		])('%s', (expression, expected) => {
			expect(evaluator.evaluate(expression, data, caller)).toEqual(expected);
		});

		it.runIf(!isQuickJS)('keeps the holes of a workflow data array', () => {
			const result = evaluator.evaluate(
				'{{ (() => { const list = $json.list; delete list[0]; return list.concat($json.other); })() }}',
				data,
				caller,
			);

			expect(result).toHaveLength(4);
			expect(0 in (result as unknown[])).toBe(false);
		});

		it('keeps a non-spreadable workflow data array whole after an expression replaces Boolean', () => {
			evaluator.evaluate(
				'{{ (function () { this.Boolean = () => true; return "x"; })() }}',
				data,
				caller,
			);

			expect(
				evaluator.evaluate(
					'{{ (() => { const list = $json.other; list[Symbol.isConcatSpreadable] = 0; return [0].concat(list).length; })() }}',
					{ $json: { other: ['a', 'b'] } },
					caller,
				),
			).toBe(2);
		});
	});
});

describe(`Integration: ${engineName} error handling`, () => {
	it('should throw TimeoutError when expression exceeds timeout', async () => {
		const bridge = newBridge({ timeout: 100 });
		await bridge.initialize();
		try {
			expect(() => bridge.execute('while(true){}', {})).toThrow(TimeoutError);
			// A spent budget must be rejected before entering the isolate, which
			// reads a non-positive timeout as no timeout at all.
			expect(() => bridge.execute('return 1;', {}, { elapsedMs: 100 })).toThrow(TimeoutError);
		} finally {
			await bridge.dispose();
		}
	});

	// QuickJS-only: its interrupt deadline is wall-clock and was previously reset
	// on every nested execute(), so a loop re-entering faster than the timeout
	// never interrupted. isolated-vm uses a CPU-time budget per call and is not
	// affected. The outer loop below burns CPU in the vm (so the interrupt fires
	// in the outer context) while periodically re-entering via $evaluateExpression.
	it.runIf(isQuickJS)(
		'should enforce the timeout even when the expression re-enters execute()',
		async () => {
			const bridge = newBridge({ timeout: 150 });
			await bridge.initialize();
			try {
				const data: Record<string, unknown> = {
					$evaluateExpression: () => bridge.execute('1', data),
				};
				const code = `
					var end = Date.now() + 5000;
					var i = 0;
					while (Date.now() < end) {
						i++;
						if (i % 100000 === 0) { this.$evaluateExpression("1"); }
					}
					return i;
				`;
				expect(() => bridge.execute(code, data)).toThrow(TimeoutError);
			} finally {
				await bridge.dispose();
			}
		},
	);

	it('should not reinitialize or execute after dispose', async () => {
		const bridge = newBridge({ timeout: 1000 });
		await bridge.initialize();
		await bridge.dispose();

		expect(bridge.isDisposed()).toBe(true);
		await expect(bridge.initialize()).rejects.toThrow();
		expect(bridge.isDisposed()).toBe(true);
		expect(() => bridge.execute('1', {})).toThrow();
	});

	it('should throw MemoryLimitError when expression exceeds memory limit', async () => {
		const bridge = newBridge({ memoryLimit: 8 });
		await bridge.initialize();
		try {
			expect(() =>
				bridge.execute('let a=[]; while(true){a.push(new Array(1000000).fill(1))}', {}),
			).toThrow(MemoryLimitError);
		} finally {
			await bridge.dispose();
		}
	});

	it('should throw MemoryLimitError when a template expression exceeds memory limit', async () => {
		const evaluator = new ExpressionEvaluator({
			createBridge: () => newBridge({ memoryLimit: 8, timeout: 5000 }),
			maxCodeCacheSize: 64,
		});
		const caller = {};
		await evaluator.initialize();
		await evaluator.acquire(caller);
		try {
			expect(() =>
				evaluator.evaluate(
					'{{ Array.from({ length: 3000000 }, (_, i) => ({ i })).length }}',
					{},
					caller,
				),
			).toThrow(MemoryLimitError);
		} finally {
			await evaluator.release(caller);
			await evaluator.dispose();
		}
	});

	it.each([
		'{{ $json.list.concat($json.list).length }}',
		'{{ (() => { const list = $json.list; list[Symbol.isConcatSpreadable] = true; return list.concat(list).length; })() }}',
	])('should concat workflow data arrays within a small memory limit: %s', async (expression) => {
		const evaluator = new ExpressionEvaluator({
			createBridge: () => newBridge({ memoryLimit: 16, timeout: 5000 }),
			maxCodeCacheSize: 64,
		});
		const caller = {};
		const data = { $json: { list: Array.from({ length: 200_000 }, () => 1) } };
		await evaluator.initialize();
		await evaluator.acquire(caller);
		try {
			expect(evaluator.evaluate(expression, data, caller)).toBe(400_000);
		} finally {
			await evaluator.release(caller);
			await evaluator.dispose();
		}
	});
});

describe('Integration: Concurrent execution pooling', () => {
	let evaluator: ExpressionEvaluator;

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({
			createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
			maxCodeCacheSize: 1024,
			poolSize: 2,
		});
		await evaluator.initialize();
	});

	afterAll(async () => {
		await evaluator.dispose();
	});

	beforeEach(async () => {
		await evaluator.waitForReplenishment();
	});

	it('should hold separate bridges for separate callers', async () => {
		const caller1 = {};
		const caller2 = {};
		await evaluator.acquire(caller1);
		await evaluator.acquire(caller2);

		const data1 = { $json: { value: 'from-ctx-1' } };
		const data2 = { $json: { value: 'from-ctx-2' } };

		const result1 = evaluator.evaluate('{{ $json.value }}', data1, caller1);
		const result2 = evaluator.evaluate('{{ $json.value }}', data2, caller2);

		expect(result1).toBe('from-ctx-1');
		expect(result2).toBe('from-ctx-2');

		await evaluator.release(caller1);
		await evaluator.release(caller2);
	});

	it('should reuse the same bridge for the same caller', async () => {
		const caller = {};
		await evaluator.acquire(caller);

		const result1 = evaluator.evaluate('{{ $json.a }}', { $json: { a: 'first' } }, caller);
		const result2 = evaluator.evaluate('{{ $json.b }}', { $json: { b: 'second' } }, caller);

		expect(result1).toBe('first');
		expect(result2).toBe('second');

		await evaluator.release(caller);
	});

	it('should replenish after acquire', async () => {
		const caller1 = {};
		await evaluator.acquire(caller1);

		await evaluator.waitForReplenishment();

		// Pool should have a fresh bridge available for a second caller
		const caller2 = {};
		await evaluator.acquire(caller2);
		const result = evaluator.evaluate('{{ $json.y }}', { $json: { y: 'replenished' } }, caller2);
		expect(result).toBe('replenished');

		await evaluator.release(caller1);
		await evaluator.release(caller2);
	});

	it('should replenish after release', async () => {
		const caller1 = {};
		await evaluator.acquire(caller1);
		await evaluator.release(caller1);

		await evaluator.waitForReplenishment();

		// Pool should have a fresh bridge available
		const caller2 = {};
		await evaluator.acquire(caller2);
		const result = evaluator.evaluate('{{ $json.y }}', { $json: { y: 'replenished' } }, caller2);
		expect(result).toBe('replenished');

		await evaluator.release(caller2);
	});
});

describe(`Integration: nested evaluation time budget (${engineName})`, () => {
	const TIMEOUT_MS = 400;
	const BURN_MS = 150;
	const DEPTH = 8;

	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({
			createBridge: () => newBridge({ timeout: TIMEOUT_MS }),
			maxCodeCacheSize: 1024,
		});
		await evaluator.initialize();
		await evaluator.acquire(caller);
	});

	afterAll(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	/**
	 * Spends `BURN_MS` inside the isolate, then hands the next depth down to
	 * `$evaluateExpression`; depth 0 spins forever. The remaining depth travels
	 * as the expression argument (a nested `{{ }}` literal would terminate the
	 * enclosing template), and the host callback turns it back into a template.
	 */
	const frame = (depth: number): string =>
		depth === 0
			? '{{ (function() { while (true) {} })() }}'
			: `{{ (function() { var s = Date.now(); while (Date.now() - s < ${BURN_MS}) {} return $evaluateExpression("${depth - 1}"); })() }}`;

	it('bounds a chain of nested evaluations to a single time budget', () => {
		let framesEvaluated = 0;
		const data: WorkflowData = {
			$evaluateExpression: (depth: string) => {
				framesEvaluated++;
				return evaluator.evaluate(frame(Number(depth)), data, caller);
			},
		};

		const start = Date.now();
		expect(() => evaluator.evaluate(frame(DEPTH), data, caller)).toThrow(
			`Nested expressions timed out after sharing the ${TIMEOUT_MS}ms limit`,
		);
		const elapsed = Date.now() - start;

		// Frame count is the load-independent signal: at BURN_MS per frame the
		// budget affords exactly two before it runs out. A frame that restarted
		// the budget would buy at least one more, whatever the host overhead.
		expect(framesEvaluated).toBe(2);
		expect(elapsed).toBeLessThan(TIMEOUT_MS * 1.5);
	});

	it('shares the budget across sequential nested evaluations', () => {
		const burn = `{{ (function() { var s = Date.now(); while (Date.now() - s < ${BURN_MS}) {} return 1; })() }}`;
		const data: WorkflowData = {
			$evaluateExpression: () => evaluator.evaluate(burn, {}, caller),
		};

		// Siblings draw on the same budget, so the later ones run out; each
		// getting a fresh one would let the pair complete.
		expect(() =>
			evaluator.evaluate(
				'{{ $evaluateExpression("a") + $evaluateExpression("a") + $evaluateExpression("a") }}',
				data,
				caller,
			),
		).toThrow(/timed out/);
	});

	it('gives a single evaluation the full budget', () => {
		const start = Date.now();
		expect(() => evaluator.evaluate(frame(0), {}, caller)).toThrow(
			`Expression timed out after ${TIMEOUT_MS}ms`,
		);
		const elapsed = Date.now() - start;

		expect(elapsed).toBeGreaterThanOrEqual(TIMEOUT_MS * 0.8);
		expect(elapsed).toBeLessThan(TIMEOUT_MS * 2);
	});
});

describe('QuickJsBridge runtimeBundle injection', () => {
	it('should not cache a runtimeBundle that fails to load', async () => {
		const withBadBundle = new QuickJsBridge({
			timeout: 5000,
			runtimeBundle: 'this is not javascript (((',
		});

		try {
			await expect(withBadBundle.initialize()).rejects.toThrow('Failed to load runtime bundle');
		} finally {
			await withBadBundle.dispose();
		}

		const withDiskRead = new QuickJsBridge({ timeout: 5000 });

		try {
			await expect(withDiskRead.initialize()).resolves.toBeUndefined();
		} finally {
			await withDiskRead.dispose();
		}
	});

	it('should initialize and evaluate when runtimeBundle is provided as a string', async () => {
		let dir = __dirname;
		let bundle: string | undefined;
		while (dir !== path.dirname(dir)) {
			try {
				bundle = await readFile(path.join(dir, 'dist', 'bundle', 'runtime.iife.js'), 'utf-8');
				break;
			} catch {}
			dir = path.dirname(dir);
		}
		if (!bundle) throw new Error('runtime bundle not found for test setup');

		const capturedBundle = bundle;
		const evaluator = new ExpressionEvaluator({
			createBridge: () => new QuickJsBridge({ timeout: 5000, runtimeBundle: capturedBundle }),
			maxCodeCacheSize: 1024,
		});
		await evaluator.initialize();
		const caller = {};
		await evaluator.acquire(caller);
		try {
			const result = evaluator.evaluate(
				'{{ $json.name }}',
				{ $json: { name: 'injected' } },
				caller,
			);
			expect(result).toBe('injected');
		} finally {
			await evaluator.release(caller);
			await evaluator.dispose();
		}
	});
});
