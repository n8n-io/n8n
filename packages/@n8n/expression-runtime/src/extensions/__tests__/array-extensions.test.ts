import { describe, it, expect } from 'vitest';

import { arrayExtensions } from '../array-extensions';

const smartJoin = arrayExtensions.functions.smartJoin as (
	value: unknown[],
	extraArgs: string[],
) => Record<string, unknown>;

const renameKeys = arrayExtensions.functions.renameKeys as (
	value: unknown[],
	extraArgs: string[],
) => Array<Record<string, unknown>>;

const unique = arrayExtensions.functions.unique as (
	value: unknown[],
	extraArgs: string[],
) => unknown[];

const merge = arrayExtensions.functions.merge as (
	value: unknown[],
	extraArgs: unknown[][],
) => Record<string, unknown>;

const mergeIntoObject = arrayExtensions.functions.mergeIntoObject as (
	value: unknown[],
	extraArgs: unknown[][],
) => Record<string, unknown>;

describe('smartJoin', () => {
	it('should join own key and value fields', () => {
		expect(
			smartJoin(
				[
					{ field: 'age', value: 2 },
					{ field: 'city', value: 'Berlin' },
				],
				['field', 'value'],
			),
		).toEqual({ age: 2, city: 'Berlin' });
	});

	it('should ignore inherited key and value fields', () => {
		const source = Object.create({ field: 'age', value: 2 }) as object;

		expect(smartJoin([source], ['field', 'value'])).toEqual({});
	});

	it('should read key and value fields served by a proxy without a getOwnPropertyDescriptor trap', () => {
		const fields: Record<string, unknown> = { field: 'age', value: 2 };
		const source = new Proxy(
			{},
			{
				has: (_target, key) => typeof key === 'string' && Object.hasOwn(fields, key),
				get: (_target, key) => (typeof key === 'string' ? fields[key] : undefined),
			},
		);

		expect(smartJoin([source], ['field', 'value'])).toEqual({ age: 2 });
	});

	it('should treat a key named __proto__ as an ordinary field', () => {
		const result = smartJoin(
			[{ field: '__proto__', value: { marker: 'set' } }],
			['field', 'value'],
		);

		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
		expect(({} as Record<string, unknown>).marker).toBeUndefined();
	});
});

describe('renameKeys', () => {
	it('should rename nothing when the source name is not an own field', () => {
		const [result] = renameKeys([{ name: 'test' }], ['toString', 'renamed']);

		expect(result).toEqual({ name: 'test' });
		expect(Object.prototype.hasOwnProperty.call(result, 'renamed')).toBe(false);
	});

	it('should treat a target name of __proto__ as an ordinary field', () => {
		const [result] = renameKeys([{ name: { marker: 'set' } }], ['name', '__proto__']);

		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
		expect(({} as Record<string, unknown>).marker).toBeUndefined();
	});
});

describe('unique', () => {
	it('should keep an element that does not own the compared field', () => {
		const inherited = Object.create({ name: 'Nathan' }) as object;

		expect(unique([{ name: 'Nathan' }, inherited], ['name'])).toHaveLength(2);
	});

	it('should read a compared field served by a proxy without a getOwnPropertyDescriptor trap', () => {
		const proxyFor = (name: string) => {
			const fields: Record<string, unknown> = { name };
			return new Proxy(
				{},
				{
					has: (_target, key) => typeof key === 'string' && Object.hasOwn(fields, key),
					get: (_target, key) => (typeof key === 'string' ? fields[key] : undefined),
				},
			);
		};

		expect(unique([proxyFor('Nathan'), proxyFor('Jan')], ['name'])).toHaveLength(2);
	});
});

describe.each([
	['merge', merge],
	['mergeIntoObject', mergeIntoObject],
])('%s', (_name, mergeFn) => {
	it('should merge an incoming field named toString', () => {
		const result = mergeFn([{ a: 1 }], [[{ toString: 'value' }]]);

		expect(Object.prototype.hasOwnProperty.call(result, 'toString')).toBe(true);
		expect(result.toString).toBe('value');
	});

	it('should treat an own __proto__ field of a source object as an ordinary field', () => {
		const source = JSON.parse('{"__proto__": {"marker": "set"}}') as Record<string, unknown>;

		const result = mergeFn([source], [[{ a: 1 }]]);

		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
		expect(({} as Record<string, unknown>).marker).toBeUndefined();
	});
});
