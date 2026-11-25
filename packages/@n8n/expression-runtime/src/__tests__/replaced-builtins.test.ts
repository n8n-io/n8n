import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { createBridge, engineName } from './test-bridge';

const payload = JSON.parse('{"__proto__":{"flag":1},"kept":2}') as Record<string, unknown>;

/** Production calls pass the workflow timezone, which makes luxon use the Intl polyfill. */
const options = { timezone: 'Europe/Paris' };

const data = {
	$json: {
		nested: { c: 1 },
		list: ['a', 'b'],
		payload,
		error: Object.assign(new Error('from host'), { code: 400 }),
		boxed: Object('from host') as object,
		taggedBoxed: Object.assign(Object('from host') as object, { meta: 1 }),
	},
};

/** Expressions that move values across the runtime boundary, with what each must return. */
const probes: Array<{ expression: string; check: (result: unknown) => void }> = [
	{ expression: '{{ ({ b: 2 }) }}', check: (result) => expect(result).toStrictEqual({ b: 2 }) },
	{ expression: '{{ [1, [2]] }}', check: (result) => expect(result).toStrictEqual([1, [2]]) },
	{ expression: '{{ $json.nested }}', check: (result) => expect(result).toStrictEqual({ c: 1 }) },
	{ expression: '{{ $json.list[1] }}', check: (result) => expect(result).toBe('b') },
	{
		expression:
			'{{ (() => { const keys = []; for (const key in $json.list) keys.push(key); return keys; })() }}',
		check: (result) => expect(result).toStrictEqual(['0', '1']),
	},
	{
		expression: '{{ $json.payload }}',
		check: (result) => {
			expect(Object.hasOwn(result as object, '__proto__')).toBe(true);
			expect(result).toStrictEqual(payload);
		},
	},
	{
		expression: '{{ $json.error }}',
		check: (result) => {
			expect(result).toBeInstanceOf(Error);
			expect(result).toMatchObject({ message: 'from host', code: 400 });
		},
	},
	{
		expression: '{{ new Map([["k", { v: 1 }]]) }}',
		check: (result) => expect(result).toStrictEqual(new Map([['k', { v: 1 }]])),
	},
	{
		expression: '{{ new (class { constructor() { this.a = 1; } })() }}',
		check: (result) => expect(result).toStrictEqual({ a: 1 }),
	},
	{
		expression:
			"{{ (() => { const error = new Error('e'); error.code = 1; error.toJSON = function () { return { code: this.code, extra: 2 }; }; return error; })() }}",
		check: (result) => {
			expect(result).toBeInstanceOf(Error);
			expect(JSON.stringify(result)).toBe('{"code":1,"extra":2}');
		},
	},
	{
		expression: "{{ new Intl.Locale('fr-FR').language }}",
		check: (result) => expect(result).toBe('fr'),
	},
	{
		expression: '{{ $now }}',
		check: (result) => expect(DateTime.isDateTime(result)).toBe(true),
	},
	{
		expression:
			'{{ [new String("ab"), new Number(-0), new Boolean(true), $json.boxed, $json.taggedBoxed.meta] }}',
		check: (result) => {
			const values = result as Array<{ valueOf(): unknown }>;
			expect(values[0]).toBeInstanceOf(String);
			expect(values[0].valueOf()).toBe('ab');
			expect(values[1]).toBeInstanceOf(Number);
			expect(Object.is(values[1].valueOf(), -0)).toBe(true);
			expect(values[2]).toBeInstanceOf(Boolean);
			expect(values[2].valueOf()).toBe(true);
			expect(values[3]).toBeInstanceOf(String);
			expect(values[3].valueOf()).toBe('from host');
			expect(values[4]).toBe(1);
		},
	},
];

const builtIns = [
	'Object.assign',
	'Object.keys',
	'Object.entries',
	'Object.hasOwn',
	'Object.is',
	'Object.defineProperty',
	'Object.getPrototypeOf',
	'Object.getOwnPropertyDescriptor',
	'Object.getOwnPropertyDescriptors',
	'Array.from',
	'Array.isArray',
	'ArrayBuffer.isView',
	'Number.isInteger',
	'JSON.parse',
];

describe(`Replaced built-ins (${engineName})`, () => {
	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeEach(async () => {
		evaluator = new ExpressionEvaluator({ createBridge, maxCodeCacheSize: 64 });
		await evaluator.initialize();
		await evaluator.acquire(caller);
	});

	afterEach(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	it.each(builtIns)('keeps the next results correct after an expression replaces %s', (name) => {
		expect(
			evaluator.evaluate(
				`{{ (${name} = function () { throw new Error('replaced'); }, 'x') }}`,
				data,
				caller,
				options,
			),
		).toBe('x');

		for (const { expression, check } of probes) {
			check(evaluator.evaluate(expression, data, caller, options));
		}
	});

	it('keeps lazy date helpers correct after an expression replaces Object.defineProperty', () => {
		expect(
			evaluator.evaluate(
				"{{ (Object.defineProperty = function () { throw new Error('replaced'); }, 'x') }}",
				data,
				caller,
				options,
			),
		).toBe('x');

		expect(
			evaluator.evaluate(
				'{{ [$now.zoneName, $today.zoneName, $today.toFormat("HH:mm:ss.SSS")] }}',
				data,
				caller,
				options,
			),
		).toStrictEqual(['Europe/Paris', 'Europe/Paris', '00:00:00.000']);
	});

	it.each([
		'String.prototype.valueOf',
		'Number.prototype.valueOf',
		'Boolean.prototype.valueOf',
		'BigInt.prototype.valueOf',
		'BigInt.prototype.toString',
		'Object.prototype.isPrototypeOf',
		'Number.isFinite',
	])('keeps boxed primitives correct after an expression replaces %s', (name) => {
		expect(
			evaluator.evaluate(
				`{{ (${name} = function () { throw new Error('replaced'); }, 'x') }}`,
				data,
				caller,
				options,
			),
		).toBe('x');

		const values = evaluator.evaluate(
			'{{ [new String("ab"), new Number(-0), new Boolean(false), Object(1n), $json.boxed] }}',
			data,
			caller,
			options,
		) as Array<{ valueOf(): unknown }>;

		expect(values[0]).toBeInstanceOf(String);
		expect(values[0].valueOf()).toBe('ab');
		expect(values[1]).toBeInstanceOf(Number);
		expect(Object.is(values[1].valueOf(), -0)).toBe(true);
		expect(values[2]).toBeInstanceOf(Boolean);
		expect(values[2].valueOf()).toBe(false);
		expect(values[3]).toBeInstanceOf(BigInt);
		expect(values[3].valueOf()).toBe(1n);
		expect(values[4]).toBeInstanceOf(String);
		expect(values[4].valueOf()).toBe('from host');
	});

	const builtInsCalledOnBoxedValues = [
		['String.prototype.valueOf'],
		['Number.prototype.valueOf'],
		['Boolean.prototype.valueOf'],
		['BigInt.prototype.valueOf'],
		['BigInt.prototype.toString'],
		['Object.prototype.toString', 'Object.prototype.isPrototypeOf'],
	];
	const callReplacements = ['return 99;', 'return undefined;', "throw new Error('replaced');"];

	it.each(
		builtInsCalledOnBoxedValues.flatMap((names) =>
			callReplacements.map((replacement) => ({ names, replacement })),
		),
	)(
		'keeps boxed primitives correct after an expression sets `call` on $names to `$replacement`',
		({ names, replacement }) => {
			const assignments = names.map((name) => `${name}.call = function () { ${replacement} }`);
			expect(
				evaluator.evaluate(`{{ (${assignments.join(', ')}, 'x') }}`, data, caller, options),
			).toBe('x');

			const values = evaluator.evaluate(
				'{{ [new String("ab"), new Number(5), new Boolean(false), Object(1n), $json.boxed, new (class extends String {})("sub")] }}',
				data,
				caller,
				options,
			) as Array<{ valueOf(): unknown }>;

			expect(values[0]).toBeInstanceOf(String);
			expect(values[0].valueOf()).toBe('ab');
			expect(values[1]).toBeInstanceOf(Number);
			expect(values[1].valueOf()).toBe(5);
			expect(values[2]).toBeInstanceOf(Boolean);
			expect(values[2].valueOf()).toBe(false);
			expect(values[3]).toBeInstanceOf(BigInt);
			expect(values[3].valueOf()).toBe(1n);
			expect(values[4]).toBeInstanceOf(String);
			expect(values[4].valueOf()).toBe('from host');
			expect(values[5]).toBeInstanceOf(String);
			expect(values[5].valueOf()).toBe('sub');
		},
	);
});
