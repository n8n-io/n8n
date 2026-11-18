import { parameterVariants } from '../variants.ts';
import type { Json, WalkNode, WalkProperty } from '../walk.ts';
import { locatorMiss, locatorSample } from '../walk.ts';

const nodeOf = (properties: WalkProperty[]): WalkNode =>
	({
		description: { name: 'acme', version: 1, properties },
	}) as unknown as WalkNode;

const expression = (field: string) => `={{ $json.${field} }}`;

const choices = (count: number) =>
	Array.from({ length: count }, (_, at) => ({ name: `Choice ${at + 1}`, value: `c${at + 1}` }));

describe('a resource locator', () => {
	const property = {
		name: 'documentURL',
		type: 'resourceLocator',
		default: { mode: 'url', value: '' },
		modes: [
			{ name: 'url', extractValue: { type: 'regex', regex: /docs\.google\.com\/document\/d\/(\w+)/ } },
			{ name: 'id', extractValue: { type: 'regex', regex: /^([A-Za-z0-9-_]+)$/ } },
			{ name: 'list', typeOptions: {} },
		],
	} as unknown as WalkProperty;

	it('gives a value that the rule of the id mode reads', () => {
		expect(locatorSample(property)).toEqual({ __rl: true, mode: 'id', value: 'id1' });
	});

	it('gives a value that the rule of the mode cannot read', () => {
		expect(locatorMiss(property, 'id')).toBe('');
	});

	it('keeps the plain value of a mode without a rule', () => {
		expect(locatorSample({ name: 'x', type: 'resourceLocator' })).toEqual({
			__rl: true,
			mode: 'id',
			value: 'id1',
		});
		expect(locatorMiss({ name: 'x', type: 'resourceLocator' }, 'id')).toBeUndefined();
		expect(locatorMiss(property, 'list')).toBeUndefined();
	});
});

describe('a fixed collection whose members show each other', () => {
	const properties = [
		{
			name: 'fieldsUi',
			type: 'fixedCollection',
			default: {},
			options: [
				{
					name: 'values',
					displayName: 'Values',
					type: 'fixedCollection',
					values: [
						{
							name: 'kind',
							displayName: 'Kind',
							type: 'options',
							default: 'text',
							options: [
								{ name: 'Text', value: 'text' },
								{ name: 'Number', value: 'number' },
							],
						},
						{
							name: 'text',
							displayName: 'Text',
							type: 'string',
							default: '',
							displayOptions: { show: { kind: ['text'] } },
						},
						{
							name: 'count',
							displayName: 'Count',
							type: 'number',
							default: 0,
							displayOptions: { show: { kind: ['number'] } },
						},
					],
				},
			],
		},
	] as unknown as WalkProperty[];

	it('gives each choice of the member that shows the others', () => {
		const variants = parameterVariants(nodeOf(properties), 1, {}, {}, [], expression);
		const group = variants.find((variant) => variant.condition === 'fieldsUi.values');
		expect(group?.member).toBe('values');
		const values = (group?.values ?? []) as Json[];
		expect(values.map((value) => value.kind)).toEqual(['text', 'number']);
	});

	it('gives a hidden member no value', () => {
		const variants = parameterVariants(nodeOf(properties), 1, {}, {}, [], expression);
		const values = (variants[0]?.values ?? []) as Json[];
		const text = values.find((value) => value.kind === 'text');
		const number = values.find((value) => value.kind === 'number');
		expect(Object.keys(text ?? {}).sort()).toEqual(['kind', 'text']);
		expect(Object.keys(number ?? {}).sort()).toEqual(['count', 'kind']);
	});

	it('keeps the values of the shown member out of the usual case', () => {
		const given = { fieldsUi: { values: { kind: 'text', text: 'x' } } };
		const variants = parameterVariants(nodeOf(properties), 1, given, {}, [], expression);
		const values = (variants[0]?.values ?? []) as Json[];
		expect(values).toContainEqual({ kind: 'number', count: 1 });
	});
});

describe('a long list of options', () => {
	const nodeOfCount = (count: number) =>
		nodeOf([
			{
				name: 'value',
				displayName: 'Value',
				type: 'options',
				default: 'a',
				options: [{ name: 'A', value: 'a' }, ...choices(count)],
			},
		] as unknown as WalkProperty[]);

	it('tries every other value when the list fits into the budget', () => {
		const variants = parameterVariants(nodeOfCount(20), 1, {}, {}, [], expression);
		const variant = variants.find((entry) => entry.condition === 'value');
		expect(variant?.values.length).toBe(20);
		expect(variant?.values).not.toContain('a');
	});

	it('tries no value when the list is longer than the budget', () => {
		const variants = parameterVariants(nodeOfCount(45), 1, {}, {}, [], expression);
		expect(variants.map((entry) => entry.condition)).toEqual([]);
	});

	it('tries no value when the list is short', () => {
		const variants = parameterVariants(nodeOfCount(2), 1, {}, {}, [], expression);
		const variant = variants.find((entry) => entry.condition === 'value');
		expect(variant?.values).toEqual(['c1', 'c2']);
	});
});

describe('a collection inside a collection', () => {
	const properties = [
		{
			name: 'fieldsUi',
			type: 'fixedCollection',
			default: {},
			options: [
				{
					name: 'values',
					displayName: 'Values',
					type: 'fixedCollection',
					values: [
						{
							name: 'nested',
							displayName: 'Nested',
							type: 'collection',
							default: {},
							options: [
								{
									name: 'deep',
									displayName: 'Deep',
									type: 'collection',
									default: {},
									options: [{ name: 'name', displayName: 'Name', type: 'string', default: '' }],
								},
							],
						},
					],
				},
			],
		},
	] as unknown as WalkProperty[];

	it('gives the member of the inner collection a value', () => {
		const variants = parameterVariants(nodeOf(properties), 1, {}, {}, [], expression);
		const values = (variants[0]?.values ?? []) as Json[];
		expect(values[0]).toEqual({ nested: { deep: { name: 'v5' } } });
	});
});
