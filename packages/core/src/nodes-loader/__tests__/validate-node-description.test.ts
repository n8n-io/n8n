import type { INodeTypeDescription } from 'n8n-workflow';

import { validateNodeDescription } from '../validate-node-description';

const baseDescription = (properties: INodeTypeDescription['properties']): INodeTypeDescription =>
	({
		displayName: 'Test',
		name: 'test',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Test' },
		inputs: [],
		outputs: [],
		properties,
	}) as unknown as INodeTypeDescription;

describe('validateNodeDescription', () => {
	it.each(['operation', 'mode', 'resource'] as const)(
		'throws when %s discriminator property has builderHint',
		(name) => {
			const description = baseDescription([
				{
					displayName: name,
					name,
					type: 'options',
					default: '',
					options: [{ name: 'A', value: 'a' }],
					builderHint: { propertyHint: 'unrendered' },
				},
			]);

			expect(() => validateNodeDescription(description)).toThrow(/discriminator.*not rendered/i);
		},
	);

	it('does not throw when discriminator option has builderHint', () => {
		const description = baseDescription([
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'classify',
				options: [
					{
						name: 'Classify',
						value: 'classify',
						builderHint: { propertyHint: 'rendered on the option' },
					},
				],
			},
		]);

		expect(() => validateNodeDescription(description)).not.toThrow();
	});

	it('does not throw when non-discriminator property has builderHint', () => {
		const description = baseDescription([
			{
				displayName: 'Conditions',
				name: 'conditions',
				type: 'filter',
				default: {},
				builderHint: { propertyHint: 'this renders' },
			},
		]);

		expect(() => validateNodeDescription(description)).not.toThrow();
	});

	it('does not throw when a string property happens to be named operation', () => {
		const description = baseDescription([
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'string',
				default: '',
				builderHint: { propertyHint: 'free-form text, not a discriminator' },
			},
		]);

		expect(() => validateNodeDescription(description)).not.toThrow();
	});

	it('throws when builderHint is on a discriminator nested inside a collection', () => {
		const description = baseDescription([
			{
				displayName: 'Wrapper',
				name: 'wrapper',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						default: '',
						options: [{ name: 'A', value: 'a' }],
						builderHint: { propertyHint: 'still unrendered' },
					},
				],
			},
		]);

		expect(() => validateNodeDescription(description)).toThrow(/discriminator.*not rendered/i);
	});

	it('reports the offending node name in the error message', () => {
		const description = baseDescription([
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: '',
				options: [{ name: 'A', value: 'a' }],
				builderHint: { propertyHint: 'oops' },
			},
		]);
		description.name = 'myNode';

		expect(() => validateNodeDescription(description)).toThrow(/myNode/);
	});
});
