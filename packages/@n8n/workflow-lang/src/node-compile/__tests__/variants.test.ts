import { parameterVariants } from '../variants.ts';
import type { Json, WalkNode, WalkProperty } from '../walk.ts';
import type { WalkMode } from '../walk.ts';
import { locatorMiss, locatorRule, locatorSample } from '../walk.ts';

const nodeOf = (properties: WalkProperty[]): WalkNode =>
	({
		description: { name: 'acme', version: 1, properties },
	}) as unknown as WalkNode;

const expression = (field: string) => `={{ $json.${field} }}`;

const choices = (count: number) =>
	Array.from({ length: count }, (_, at) => ({ name: `Choice ${at + 1}`, value: `c${at + 1}` }));

describe('a resource locator', () => {
	const modes = [
		{ name: 'url', extractValue: { type: 'regex', regex: /docs\.google\.com\/document\/d\/(\w+)/ } },
		{ name: 'id', extractValue: { type: 'regex', regex: /^([A-Za-z0-9-_]+)$/ } },
		{ name: 'list' },
	] as unknown as WalkMode[];

	const mode = (name: string) => modes.find((entry) => entry.name === name);

	it('gives a value that the rule of a mode reads', () => {
		expect(locatorSample(mode('id'))).toBe('id1');
		expect(locatorSample(mode('url'))).toBeUndefined();
	});

	it('gives a value that the rule of a mode cannot read', () => {
		expect(locatorMiss(mode('id'))).toBe('');
		expect(locatorMiss(mode('url'))).toBe('');
	});

	it('gives a value for a mode without a rule', () => {
		expect(locatorSample(mode('list'))).toBe('id1');
		expect(locatorMiss(mode('list'))).toBeUndefined();
		expect(locatorSample(undefined)).toBe('id1');
		expect(locatorMiss(undefined)).toBeUndefined();
	});

	it('reads the rule of a mode as the node declares it', () => {
		expect(locatorRule(mode('id'))?.source).toBe('^([A-Za-z0-9-_]+)$');
		expect(locatorRule(mode('list'))).toBeUndefined();
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
