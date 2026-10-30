import { types } from 'node:util';
import { describe, expect, it } from 'vitest';

import { copyProxies } from '../copy-proxies';

const hasProxy = (value: unknown): boolean =>
	typeof value === 'object' &&
	value !== null &&
	(types.isProxy(value) || Object.values(value).some(hasProxy));

describe('copyProxies', () => {
	it('returns primitives unchanged', () => {
		expect(copyProxies(42)).toBe(42);
		expect(copyProxies('a')).toBe('a');
		expect(copyProxies(null)).toBe(null);
		expect(copyProxies(undefined)).toBe(undefined);
	});

	it('preserves data without proxies', () => {
		const value = [{ json: { id: 42, nested: [1, { a: 2 }] } }];
		expect(copyProxies(value)).toStrictEqual(value);
	});

	it('copies a proxy object to a plain object', () => {
		const result = copyProxies(new Proxy({ id: 42, nested: new Proxy({ a: 1 }, {}) }, {}));
		expect(result).toEqual({ id: 42, nested: { a: 1 } });
		expect(hasProxy(result)).toBe(false);
	});

	it('copies a proxy array to a plain array', () => {
		const result = copyProxies(new Proxy([1, new Proxy({ a: 1 }, {})], {}));
		expect(Array.isArray(result)).toBe(true);
		expect(result).toEqual([1, { a: 1 }]);
		expect(hasProxy(result)).toBe(false);
	});

	it('copies a proxy date to a date', () => {
		const date = new Date('2026-10-30T00:00:00.000Z');
		// Like a vm2 proxy, bind methods to the target so `getTime` works.
		const proxy = new Proxy(date, {
			get: (target, key) => {
				const property: unknown = Reflect.get(target, key);
				return typeof property === 'function' ? property.bind(target) : property;
			},
		});
		const result = copyProxies(proxy);
		expect(result).toBeInstanceOf(Date);
		expect(types.isProxy(result)).toBe(false);
		expect(result).toEqual(date);
	});

	it('copies nested proxies without changing the source data', () => {
		const untouched = { b: 2 };
		const value = { item: { json: new Proxy({ id: 42 }, {}) }, untouched };
		const result = copyProxies(value) as typeof value;
		expect(result).not.toBe(value);
		expect(result).toEqual({ item: { json: { id: 42 } }, untouched });
		expect(hasProxy(result)).toBe(false);
		expect(types.isProxy(value.item.json)).toBe(true);
		expect(value.item.json).toEqual({ id: 42 });
	});

	it('keeps class instances unchanged', () => {
		class Point {
			constructor(readonly x: number) {}
		}
		const point = new Point(1);
		expect((copyProxies({ point }) as { point: Point }).point).toBe(point);
	});

	it.each([
		{ name: 'Map', value: new Map([['id', 42]]) },
		{ name: 'Set', value: new Set([42]) },
		{ name: 'RegExp', value: /sample/ },
		{ name: 'Error', value: new Error('sample') },
		{ name: 'typed array', value: new Uint8Array([42]) },
		{ name: 'DataView', value: new DataView(new ArrayBuffer(4)) },
		{ name: 'ArrayBuffer', value: new ArrayBuffer(4) },
	])('keeps a proxied $name for native transfer validation', ({ value }) => {
		const proxy = new Proxy(value, {});
		const result = copyProxies({ nested: proxy }) as { nested: unknown };

		expect(copyProxies(proxy)).toBe(proxy);
		expect(result.nested).toBe(proxy);
		expect(() => structuredClone(result)).toThrow();
	});

	it('handles a cycle through a proxy', () => {
		const target: Record<string, unknown> = { id: 42 };
		const proxy = new Proxy(target, {});
		target.self = proxy;
		const result = copyProxies(proxy) as Record<string, unknown>;
		expect(result.id).toBe(42);
		expect(result.self).toBe(result);
		expect(types.isProxy(result)).toBe(false);
	});

	it('preserves shared containers that hold a proxy', () => {
		const item = { json: new Proxy({ id: 42 }, {}) };
		const result = copyProxies([item, item]) as Array<typeof item>;
		expect(result[0]).toBe(result[1]);
		expect(hasProxy(result)).toBe(false);
		expect(structuredClone(result)).toEqual([{ json: { id: 42 } }, { json: { id: 42 } }]);
	});

	it.each([false, true])('preserves an ordinary cycle (self first: %s)', (selfFirst) => {
		const value: Record<string, unknown> = {};
		if (selfFirst) {
			value.self = value;
		}
		value.json = new Proxy({ id: 42 }, {});
		value.self = value;
		const result = copyProxies(value) as typeof value;
		expect(result.self).toBe(result);
		expect(types.isProxy(result.json)).toBe(false);
		expect(() => structuredClone(result)).not.toThrow();
		expect(value.self).toBe(value);
		expect(types.isProxy(value.json)).toBe(true);
	});

	it('preserves a cycle through another container', () => {
		const value: Record<string, unknown> = {};
		value.child = { parent: value };
		value.json = new Proxy({ id: 42 }, {});
		const result = copyProxies(value) as { child: { parent: unknown }; json: unknown };
		expect(result.child.parent).toBe(result);
		expect(types.isProxy(result.json)).toBe(false);
		expect(() => structuredClone(result)).not.toThrow();
	});

	it('preserves a cycle without proxies', () => {
		const value: Record<string, unknown> = {};
		value.self = value;
		const result = copyProxies(value) as typeof value;
		expect(result.self).toBe(result);
		expect(value.self).toBe(value);
	});

	it.each([false, true])('preserves sparse array holes and length (proxy: %s)', (proxied) => {
		const array = new Array<unknown>(3);
		array[1] = new Proxy({ id: 42 }, {});
		const value = proxied ? new Proxy(array, {}) : array;
		const result = copyProxies(value) as unknown[];
		expect(result).toHaveLength(3);
		expect(Object.keys(result)).toEqual(['1']);
		expect(result[1]).toEqual({ id: 42 });
		expect(hasProxy(result)).toBe(false);
	});

	it('preserves the length of a proxy array with only holes', () => {
		const result = copyProxies(new Proxy(new Array<unknown>(3), {})) as unknown[];
		expect(result).toHaveLength(3);
		expect(Object.keys(result)).toEqual([]);
	});

	it.each([false, true])('preserves own data properties (proxy: %s)', (proxied) => {
		const value = { ['__proto__']: new Proxy({ id: 42 }, {}), id: 1 };
		const result = copyProxies(proxied ? new Proxy(value, {}) : value);
		expect(Object.getOwnPropertyDescriptor(result, '__proto__')).toEqual({
			value: { id: 42 },
			writable: true,
			enumerable: true,
			configurable: true,
		});
		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(JSON.stringify(result)).toBe('{"__proto__":{"id":42},"id":1}');
	});
});
