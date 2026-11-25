import { describe, expect, it, vi } from 'vitest';

import { HostDataResolver } from '../host-data-resolver';
import { dispatchHostCall, getArrayElement, getValueAtPath } from '../host-functions';

describe.each([
	{
		name: 'getValueAtPath',
		read: (value: unknown) =>
			getValueAtPath(new HostDataResolver({ $json: { value } }), Object.freeze(['$json', 'value'])),
	},
	{
		name: 'getArrayElement',
		read: (value: unknown) =>
			getArrayElement(
				new HostDataResolver({ $json: { values: [value] } }),
				Object.freeze(['$json', 'values']),
				0,
			),
	},
])('$name metadata', ({ read }) => {
	it.each([undefined, null, false, 0, '', 42, 'text'])('preserves %j', (value) => {
		expect(read(value)).toBe(value);
	});

	it('returns dates directly', () => {
		const value = new Date('2026-01-01T00:00:00Z');

		expect(read(value)).toBe(value);
	});

	it.each([
		Object('ab') as object,
		Object(5) as object,
		Object(true) as object,
		Object(1n) as object,
	])('returns boxed primitive %p directly', (value) => {
		expect(read(value)).toBe(value);
	});

	it('describes a boxed primitive with own fields without invoking getters', () => {
		const readSecret = vi.fn(() => 'secret');
		const readHidden = vi.fn(() => 'hidden');
		const value = Object('ab') as object;
		Object.defineProperty(value, 'secret', { get: readSecret, enumerable: true });
		Object.defineProperty(value, 'meta', { value: 1, enumerable: true });
		Object.defineProperty(value, 'hidden', { get: readHidden, enumerable: false });

		const result = read(value) as {
			__isBoxed: boolean;
			__value: unknown;
			__keys: string[];
			__hiddenKeys?: string[];
		};

		expect(readSecret).not.toHaveBeenCalled();
		expect(readHidden).not.toHaveBeenCalled();
		expect(result.__isBoxed).toBe(true);
		expect(result.__value).toBe(value);
		expect(result.__keys).toEqual(['secret', 'meta']);
		expect(result.__hiddenKeys).toEqual(['hidden']);
	});

	it('describes a boxed primitive with only non-enumerable own fields', () => {
		const value = Object.defineProperty(Object(5) as object, 'meta', { value: 1 });

		const result = read(value) as {
			__isBoxed: boolean;
			__value: unknown;
			__keys: string[];
			__hiddenKeys?: string[];
		};

		expect(result.__isBoxed).toBe(true);
		expect(result.__value).toBe(value);
		expect(result.__keys).toEqual([]);
		expect(result.__hiddenKeys).toEqual(['meta']);
	});

	it('describes circular boxed primitives without recursing', () => {
		const selfRef = Object('ab') as object & { self?: unknown };
		selfRef.self = selfRef;

		const selfResult = read(selfRef) as { __isBoxed: boolean; __value: unknown; __keys: string[] };
		expect(selfResult.__isBoxed).toBe(true);
		expect(selfResult.__value).toBe(selfRef);
		expect(selfResult.__keys).toEqual(['self']);

		const first = Object(1) as object & { other?: unknown };
		const second = Object(2) as object & { other?: unknown };
		first.other = second;
		second.other = first;

		const mutualResult = read(first) as { __isBoxed: boolean; __value: unknown; __keys: string[] };
		expect(mutualResult.__isBoxed).toBe(true);
		expect(mutualResult.__value).toBe(first);
		expect(mutualResult.__keys).toEqual(['other']);
	});

	it('describes a boxed primitive with a throwing getter without throwing', () => {
		const value = Object(5) as object;
		Object.defineProperty(value, 'boom', {
			get() {
				throw new Error('getter failed');
			},
			enumerable: true,
		});

		const result = read(value) as { __isBoxed: boolean; __value: unknown; __keys: string[] };

		expect(result.__isBoxed).toBe(true);
		expect(result.__value).toBe(value);
		expect(result.__keys).toEqual(['boom']);
	});

	it('describes an object inheriting String.prototype without a slot as a plain object', () => {
		const fake = Object.create(String.prototype) as object;

		expect(read(fake)).toEqual({ __isObject: true, __keys: [] });
	});

	it('returns undefined for functions without calling them', () => {
		const value = vi.fn();

		expect(read(value)).toBeUndefined();
		expect(value).not.toHaveBeenCalled();
	});

	it('describes an array without reading its elements', () => {
		const readElement = vi.fn(() => 42);
		const value = Object.freeze(Object.defineProperty([0, 1], '0', { get: readElement }));

		expect(read(value)).toEqual({ __isArray: true, __length: 2, __data: null });
		expect(readElement).not.toHaveBeenCalled();
	});

	it('describes an object without reading its property values', () => {
		const readCount = vi.fn(() => 42);
		const value = Object.freeze({
			get count() {
				return readCount();
			},
		});

		expect(read(value)).toEqual({ __isObject: true, __keys: ['count'] });
		expect(readCount).not.toHaveBeenCalled();
	});
});

describe('getArrayElement indices', () => {
	it.each([-1, 0.5, NaN, Infinity, '0', 'constructor'])(
		'returns undefined for invalid index %s',
		(index) => {
			const resolver = new HostDataResolver({ $json: { items: [42] } });

			expect(getArrayElement(resolver, ['$json', 'items'], index as number)).toBeUndefined();
		},
	);

	it('returns undefined for a negative index with an own property', () => {
		const items = Object.assign([42], { '-1': 'hidden' });
		const resolver = new HostDataResolver({ $json: { items } });

		expect(getArrayElement(resolver, ['$json', 'items'], -1)).toBeUndefined();
	});

	it('returns undefined for an index past the end of the array', () => {
		const resolver = new HostDataResolver({ $json: { items: [42] } });

		expect(getArrayElement(resolver, ['$json', 'items'], 1)).toBeUndefined();
	});

	it.each([undefined, null, {}, 42])('returns undefined for a non-array value %j', (value) => {
		const resolver = new HostDataResolver({ $json: { items: value } });

		expect(getArrayElement(resolver, ['$json', 'items'], 0)).toBeUndefined();
	});
});

describe('dispatchHostCall checkNode', () => {
	it('resolves the node and returns undefined', () => {
		const $ = vi.fn(() => ({ first: () => 42 }));
		const resolver = new HostDataResolver({ $ });

		expect(dispatchHostCall({ type: 'checkNode', nodeName: 'Foo' }, resolver)).toBeUndefined();
		expect($).toHaveBeenCalledWith('Foo');
	});

	it('reuses the checked node for typed RPCs', () => {
		const $ = vi.fn(() => ({ first: () => 42 }));
		const resolver = new HostDataResolver({ $ });

		dispatchHostCall({ type: 'checkNode', nodeName: 'Foo' }, resolver);

		expect(dispatchHostCall({ type: 'getNodeFirst', nodeName: 'Foo' }, resolver)).toBe(42);
		expect($).toHaveBeenCalledTimes(1);
	});

	it('throws the error of the host $', () => {
		const error = new Error("Referenced node doesn't exist");
		const resolver = new HostDataResolver({
			$: () => {
				throw error;
			},
		});

		expect(() => dispatchHostCall({ type: 'checkNode', nodeName: 'Unknown' }, resolver)).toThrow(
			error,
		);
	});

	it.each([null, 123, false, undefined])('rejects the node name %j', (nodeName) => {
		const $ = vi.fn();
		const resolver = new HostDataResolver({ $ });

		expect(() => dispatchHostCall({ type: 'checkNode', nodeName }, resolver)).toThrow();
		expect($).not.toHaveBeenCalled();
	});
});
