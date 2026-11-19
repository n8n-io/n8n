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

describe('whole item data', () => {
	const row = { id: 1, tags: ['a', 'b'] };
	const whole = (value: unknown) => ({ __n8nType: 'HostData', __value: value });

	it('returns small data under $json whole', () => {
		const resolver = new HostDataResolver({ $json: { rows: [row] } });

		expect(getValueAtPath(resolver, ['$json'], 1000)).toEqual(whole({ rows: [row] }));
		expect(getValueAtPath(resolver, ['$json', 'rows'], 1000)).toEqual(whole([row]));
		expect(getArrayElement(resolver, ['$json', 'rows'], 0, 1000)).toEqual(whole(row));
	});

	it('returns a primitive under $json as it is', () => {
		const resolver = new HostDataResolver({ $json: { name: 'text', ids: [7] } });

		expect(getValueAtPath(resolver, ['$json', 'name'], 1000)).toBe('text');
		expect(getArrayElement(resolver, ['$json', 'ids'], 0, 1000)).toBe(7);
	});

	it('describes data over the size limit, and returns its small parts whole', () => {
		const resolver = new HostDataResolver({ $json: { text: 'x'.repeat(2000), row } });

		expect(getValueAtPath(resolver, ['$json'], 1000)).toEqual({
			__isObject: true,
			__keys: ['text', 'row'],
		});
		expect(getValueAtPath(resolver, ['$json', 'row'], 1000)).toEqual(whole(row));
	});

	it('describes data that JSON cannot carry', () => {
		const resolver = new HostDataResolver({ $json: { at: new Date(0) } });

		expect(getValueAtPath(resolver, ['$json'], 1000)).toEqual({ __isObject: true, __keys: ['at'] });
	});

	it('describes small data under another root without reading it', () => {
		const read = vi.fn(() => 1);
		const $parameter = Object.defineProperty({}, 'value', { get: read, enumerable: true });
		const resolver = new HostDataResolver({ $parameter, $vars: row });

		expect(getValueAtPath(resolver, ['$parameter'], 1000)).toEqual({
			__isObject: true,
			__keys: ['value'],
		});
		expect(getValueAtPath(resolver, ['$vars'], 1000)).toEqual({
			__isObject: true,
			__keys: ['id', 'tags'],
		});
		expect(read).not.toHaveBeenCalled();
	});

	it('describes small data under $json when no size limit is given', () => {
		const resolver = new HostDataResolver({ $json: { rows: [row] } });

		expect(getValueAtPath(resolver, ['$json'])).toEqual({ __isObject: true, __keys: ['rows'] });
		expect(getArrayElement(resolver, ['$json', 'rows'], 0)).toEqual({
			__isObject: true,
			__keys: ['id', 'tags'],
		});
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
