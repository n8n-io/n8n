import { describe, expect, it, vi } from 'vitest';

import { HostDataResolver } from '../host-data-resolver';
import { getArrayElement, getValueAtPath } from '../host-functions';

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
