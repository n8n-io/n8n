import type { INodeProperties } from 'n8n-workflow';

import { getParameterDefaults } from '../output-schema-parameter-defaults';

const property = (overrides: Partial<INodeProperties> & { name: string }): INodeProperties => ({
	displayName: overrides.name,
	type: 'boolean',
	default: true,
	...overrides,
});

describe('getParameterDefaults', () => {
	it('returns the default of each property', () => {
		const defaults = getParameterDefaults(
			[property({ name: 'simple', default: true }), property({ name: 'limit', default: 50 })],
			{},
		);

		expect(defaults).toEqual({ simple: true, limit: 50 });
	});

	it('returns nothing when the node has no properties', () => {
		expect(getParameterDefaults(undefined, {})).toEqual({});
	});

	it('skips a property that is not shown for the resource and operation', () => {
		const defaults = getParameterDefaults(
			[
				property({
					name: 'simple',
					default: false,
					displayOptions: { show: { resource: ['draft'], operation: ['get'] } },
				}),
				property({
					name: 'simple',
					default: true,
					displayOptions: { show: { resource: ['message'], operation: ['get'] } },
				}),
			],
			{ resource: 'message', operation: 'get' },
		);

		expect(defaults).toEqual({ simple: true });
	});

	it('keeps the first default when a name repeats', () => {
		const defaults = getParameterDefaults(
			[property({ name: 'simple', default: true }), property({ name: 'simple', default: false })],
			{},
		);

		expect(defaults).toEqual({ simple: true });
	});

	it.each(['constructor', 'toString', '__proto__'])(
		'keeps the default of a property named %s',
		(name) => {
			const defaults = getParameterDefaults([property({ name, default: false })], {});

			expect(Object.hasOwn(defaults, name)).toBe(true);
			expect(Object.getOwnPropertyDescriptor(defaults, name)?.value).toBe(false);
		},
	);
});
