import { validateFieldType } from 'n8n-workflow';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import type { NodeDescription } from '../../convert/node-parameters.ts';
import { parameterValidationOf } from '../convert.ts';
import { specialiseNode } from '../specialise.ts';
import type { ParameterValidation } from '../validate.ts';
import { fieldNeed, planValidation } from '../validate.ts';
import { checkedSamples, parameterVariants } from '../variants.ts';
import { requiredParameters } from '../walk.ts';

const ENTRY = '/acme/Acme.node.ts';
const TYPE = 'n8n-nodes-acme.acme';

const nodeSource = (read: string) => `
export class Acme {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				returnData.push({ json: { out: ${read} } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { message: error.message, description: error.description } });
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}`;

const compileWith = (
	read: string,
	parameters: Record<string, unknown>,
	rules: Record<string, ParameterValidation>,
) =>
	specialiseNode({
		type: TYPE,
		version: 1,
		entry: ENTRY,
		readFile: (path) => (path === ENTRY ? nodeSource(read) : undefined),
		parameters,
		instanceId: null,
		continueOnFail: true,
		validation: (name) => rules[name],
	});

const fixture = {
	trigger: { body: {}, headers: {}, query: {} },
	now: 0,
	seed: 1,
	effects: {},
};

async function run(source: string | undefined, each: unknown[]): Promise<unknown[]> {
	const workflow = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'probe' })],
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(TYPE)},
			typeVersion: 1,
			parameters: ${JSON.stringify({ each })},
			items: ${JSON.stringify(each.map(() => ({})))},
		});
	},
});
`;
	const nodes = { 'nodes/compiled-node.ts': source ?? '' };
	const compiled = compile(workflow, { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const reference = await runReference(workflow, fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	expect(reference.status).toBe('ok');
	const rows: unknown = reference.result;
	return Array.isArray(rows) ? rows : [];
}

const plain = (value: unknown): unknown => JSON.parse(JSON.stringify({ value }));

const VALUES: unknown[] = [
	null,
	'abc',
	'',
	' ',
	'5',
	' 5 ',
	'1e3',
	'-1.5',
	'true',
	'TRUE',
	'False',
	'0',
	'1',
	'x',
	'null',
	'5,6',
	0,
	1,
	2,
	-1.5,
	true,
	false,
	[],
	[5],
	['5'],
	[true],
	[null],
	[[1]],
	[1, 2],
	{},
	{ a: 1 },
	'[1,2]',
	"['a','b']",
	'{"a":1}',
	'10:30',
	'10:30:15',
	'10:30+0100',
	'10:30:15+01:00',
	'10:30+1',
	'10:30+010',
	'10:30:1',
	'25:99-1:00',
	['10:30'],
	'a.b.c',
	'a-_.b.c+/=.',
	'a.b.',
	'a..c',
	'a.b',
	'.b.c',
	['a.b.c'],
];

const OPTIONS = [
	{ name: 'A', value: 'abc' },
	{ name: 'Five', value: 5 },
	{ name: 'Yes', value: true },
];

const CASTS: Array<{ type: string; attempt: boolean; strings: boolean; conversions: boolean }> = [
	{ type: 'string', attempt: false, strings: false, conversions: false },
	{ type: 'string', attempt: false, strings: true, conversions: true },
	{ type: 'string', attempt: true, strings: true, conversions: true },
	{ type: 'number', attempt: false, strings: false, conversions: false },
	{ type: 'number', attempt: false, strings: false, conversions: true },
	{ type: 'boolean', attempt: false, strings: false, conversions: false },
	{ type: 'boolean', attempt: false, strings: false, conversions: true },
	{ type: 'time', attempt: false, strings: false, conversions: false },
	{ type: 'array', attempt: false, strings: false, conversions: false },
	{ type: 'array', attempt: false, strings: false, conversions: true },
	{ type: 'options', attempt: false, strings: false, conversions: false },
	{ type: 'jwt', attempt: false, strings: false, conversions: false },
	{ type: 'custom', attempt: false, strings: false, conversions: false },
];

const MAPPER_READ = "this.getNodeParameter('columns.value', i)";

describe('the casts of a compiled resource mapper value', () => {
	it.each(CASTS)(
		'gives the value or the error of v1 for $type ($conversions, $attempt, $strings)',
		async (c) => {
			const parameters = {
				columns: {
					mappingMode: 'defineBelow',
					value: { f: '={{ $json.f }}' },
					schema: [{ id: 'f', type: c.type, options: OPTIONS }],
					attemptToConvertTypes: c.attempt,
					convertFieldsToString: c.strings,
				},
			};
			const rule: ParameterValidation = {
				type: 'resourceMapper',
				label: 'Columns',
				mapper: { adds: false, conversions: c.conversions, strings: false },
			};
			const result = compileWith(MAPPER_READ, parameters, { columns: rule });
			expect(result.errors).toEqual([]);
			expect(result.source).toContain('__validMapped(');
			const rows = await run(
				result.source,
				VALUES.map((f) => ({ 'columns.value': { f } })),
			);
			const expected = VALUES.map((f, i) => {
				const checked = validateFieldType('f', f, c.type as 'string', {
					valueOptions: OPTIONS,
					strict: c.conversions && !c.attempt,
					parseStrings: c.conversions && c.strings,
				});
				return checked.valid
					? { out: { f: checked.newValue } }
					: { message: `Invalid input for 'f' [item ${i}]`, description: checked.errorMessage };
			});
			expect(rows.map(plain)).toEqual(expected.map(plain));
		},
	);

	it('rejects a required field without a value when the mapper adds a row', async () => {
		const parameters = {
			columns: {
				mappingMode: 'defineBelow',
				value: { name: '={{ $json.name }}', done: '={{ $json.done }}', fixed: 'a' },
				schema: [
					{ id: 'name', required: true },
					{ id: 'done', type: 'boolean', required: true },
					{ id: 'fixed', type: 'string', required: true },
				],
			},
		};
		const rule = (adds: boolean): ParameterValidation => ({
			type: 'resourceMapper',
			label: 'Columns',
			mapper: { adds, conversions: false, strings: false },
		});
		const each = [{ 'columns.value': { name: null, done: null, fixed: 'a' } }];
		const adding = compileWith(MAPPER_READ, parameters, { columns: rule(true) });
		expect(adding.errors).toEqual([]);
		expect(adding.source).not.toContain('"fixed"');
		expect(await run(adding.source, each)).toEqual([
			{
				message: "Invalid input for 'name' [item 0]",
				description: 'The value "name" is required but not set',
			},
		]);
		const updating = compileWith(MAPPER_READ, parameters, { columns: rule(false) });
		expect(await run(updating.source, each)).toEqual([{ out: { name: null, fixed: 'a' } }]);
	});

	it('adds no check when each value has the type of its field', () => {
		const parameters = {
			columns: {
				mappingMode: 'defineBelow',
				value: {
					count: 5,
					done: true,
					tags: ['a'],
					name: 'n',
					kind: 'abc',
					free: '={{ $json.x }}',
				},
				schema: [
					{ id: 'count', type: 'number' },
					{ id: 'done', type: 'boolean' },
					{ id: 'tags', type: 'array' },
					{ id: 'name', type: 'string' },
					{ id: 'kind', type: 'options', options: OPTIONS },
					{ id: 'free' },
					{ id: 'absent', type: 'dateTime' },
				],
			},
		};
		const rule: ParameterValidation = {
			type: 'resourceMapper',
			label: 'Columns',
			mapper: { adds: true, conversions: true, strings: false },
		};
		const result = compileWith(MAPPER_READ, parameters, { columns: rule });
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('__valid');
	});

	it('casts a fixed value that has another type', async () => {
		const parameters = {
			columns: {
				mappingMode: 'defineBelow',
				value: { count: '5', done: 'true', empty: null },
				schema: [
					{ id: 'count', type: 'number' },
					{ id: 'done', type: 'boolean' },
					{ id: 'empty', type: 'dateTime' },
				],
				attemptToConvertTypes: true,
			},
		};
		const rule: ParameterValidation = {
			type: 'resourceMapper',
			label: 'Columns',
			mapper: { adds: false, conversions: true, strings: false },
		};
		const result = compileWith(MAPPER_READ, parameters, { columns: rule });
		expect(result.errors).toEqual([]);
		expect(await run(result.source, [{}])).toEqual([{ out: { count: 5, done: true } }]);
	});

	it.each(['dateTime', 'object', 'url', 'binary', 'form-fields'])(
		'does not compile a %s field with a value that it cannot prove',
		(type) => {
			const parameters = {
				columns: {
					mappingMode: 'defineBelow',
					value: { f: '={{ $json.f }}' },
					schema: [{ id: 'f', type }],
				},
			};
			const rule: ParameterValidation = {
				type: 'resourceMapper',
				label: 'Columns',
				mapper: { adds: false, conversions: false, strings: false },
			};
			const result = compileWith(MAPPER_READ, parameters, { columns: rule });
			expect(result.errors.join(' ')).toContain(
				`v1 checks the type of the parameter 'columns.value' when the node reads it, and the check of the type '${type}' has no compiled form for this value`,
			);
			const skipped = compileWith(
				"this.getNodeParameter('columns.value', i, {}, { skipValidation: true })",
				parameters,
				{ columns: rule },
			);
			expect(skipped.errors).toEqual([]);
		},
	);

	it('does not compile a read with ensureType or rawExpressions', () => {
		for (const option of ["ensureType: 'number'", 'rawExpressions: true']) {
			const result = compileWith(
				`this.getNodeParameter('count', i, 0, { ${option} })`,
				{ count: 1 },
				{},
			);
			expect(result.errors.join(' ')).toContain("the options of 'this.getNodeParameter'");
		}
	});
});

describe('a parameter with validateType', () => {
	const rule = (type: string): ParameterValidation => ({
		type: 'string',
		label: 'Count',
		own: { type, label: 'Count' },
	});
	const READ = "this.getNodeParameter('count', i)";

	it('adds no check for a fixed value of the right type', () => {
		const result = compileWith(READ, { count: 5 }, { count: rule('number') });
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('__valid');
		const text = compileWith(READ, { count: 'five' }, { count: rule('string') });
		expect(text.source).not.toContain('__valid');
	});

	it('casts or rejects the value of each item as v1 does', async () => {
		const result = compileWith(READ, { count: '={{ $json.c }}' }, { count: rule('number') });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain(
			'__validParameter(__deepCopy(__perItem[i]["count"]), "count", "number", "Count", i)',
		);
		const rows = await run(result.source, [{ count: '7' }, { count: 'x' }, { count: null }]);
		expect(rows).toEqual([
			{ out: 7 },
			{
				message: "Invalid input for 'Count' [item 1]",
				description: "'count' expects a number but we got 'x'",
			},
			{},
		]);
	});

	it('casts a fixed value of another type at the read', async () => {
		const result = compileWith(READ, { count: '7' }, { count: rule('number') });
		expect(result.errors).toEqual([]);
		expect(await run(result.source, [{}])).toEqual([{ out: 7 }]);
		const wrong = compileWith(READ, { count: 'seven' }, { count: rule('number') });
		expect(await run(wrong.source, [{}])).toEqual([
			{
				message: "Invalid input for 'Count' [item 0]",
				description: "'count' expects a number but we got 'seven'",
			},
		]);
	});

	it('gives undefined for null with a string type', async () => {
		const result = compileWith(READ, { count: '={{ $json.c }}' }, { count: rule('string') });
		expect(await run(result.source, [{ count: null }, { count: 5 }])).toEqual([{}, { out: 5 }]);
	});

	it('does not use an unchecked value as a constant of the node code', () => {
		const read =
			"this.getNodeParameter('other', i, '', this.getNodeParameter('count', i) ? { skipValidation: true } : undefined)";
		const fixed = compileWith(read, { count: 1, other: 'a' }, { count: rule('number') });
		expect(fixed.errors).toEqual([]);
		const cast = compileWith(read, { count: '1', other: 'a' }, { count: rule('number') });
		expect(cast.errors.join(' ')).toContain("the options of 'this.getNodeParameter'");
	});

	it('does not compile a type without a compiled check', () => {
		const result = compileWith(READ, { count: 'example.com' }, { count: rule('url') });
		expect(result.errors.join(' ')).toContain("the check of the type 'url' has no compiled form");
	});
});

describe('the members of a collection with validateType', () => {
	const options: ParameterValidation = {
		type: 'collection',
		label: 'Options',
		members: {
			limit: { type: 'number', label: 'Limit' },
			mode: { type: 'options', label: 'Mode', options: ['a', 'b'] },
		},
	};
	const filters: ParameterValidation = {
		type: 'fixedCollection',
		label: 'Filters',
		groups: { conditions: { size: { type: 'number', label: 'Size' } } },
	};

	it('adds no check for fixed members of the right type', () => {
		const result = compileWith(
			"this.getNodeParameter('options', i)",
			{ options: { limit: 5, mode: 'a', other: 'x' } },
			{ options },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('__valid');
	});

	it('casts and rejects the members as v1 does', async () => {
		const result = compileWith(
			"this.getNodeParameter('options', i)",
			{ options: { limit: '={{ $json.l }}', mode: 'a' } },
			{ options },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('[["limit", "number", "Limit", null]], "Options", i)');
		const rows = await run(result.source, [
			{ options: { limit: '5', mode: 'a' } },
			{ options: { limit: 'many', mode: 'a' } },
		]);
		expect(rows).toEqual([
			{ out: { limit: 5, mode: 'a' } },
			{
				message: "Invalid input for field 'Limit' inside 'Options' in [item 1]",
				description: "'limit' expects a number but we got 'many'",
			},
		]);
	});

	it('rejects a fixed member that is not one of the choices', async () => {
		const result = compileWith(
			"this.getNodeParameter('options', i)",
			{ options: { mode: 'c' } },
			{ options },
		);
		expect(await run(result.source, [{}])).toEqual([
			{
				message: "Invalid input for field 'Mode' inside 'Options' in [item 0]",
				description: "'mode' expects one of the following values: [a, b] but we got 'c'",
			},
		]);
	});

	it('checks the entries of a group of a fixed collection', async () => {
		const parameters = { filters: { conditions: [{ size: '3' }, { size: 4 }] } };
		const group = compileWith("this.getNodeParameter('filters.conditions', i)", parameters, {
			filters,
		});
		expect(group.errors).toEqual([]);
		expect(await run(group.source, [{}])).toEqual([{ out: [{ size: 3 }, { size: 4 }] }]);
		const whole = compileWith("this.getNodeParameter('filters', i)", parameters, { filters });
		expect(whole.source).not.toContain('__valid');
	});

	it('does not compile a member with a type that has no compiled check', () => {
		const rule: ParameterValidation = {
			type: 'collection',
			label: 'Options',
			members: { body: { type: 'object', label: 'Body' } },
		};
		const read = "this.getNodeParameter('options', i)";
		expect(compileWith(read, { options: { body: { a: 1 } } }, { options: rule }).errors).toEqual(
			[],
		);
		const dynamic = compileWith(read, { options: { body: '={{ $json.b }}' } }, { options: rule });
		expect(dynamic.errors.join(' ')).toContain(
			"the check of the type 'object' has no compiled form",
		);
	});
});

describe('the validation that the description of a node gives', () => {
	const description = {
		name: 'acme',
		properties: [
			{ displayName: 'Mode', name: 'mode', type: 'options', default: 'a' },
			{
				displayName: 'Hidden Count',
				name: 'count',
				type: 'string',
				default: '',
				validateType: 'number',
				displayOptions: { show: { mode: ['b'] } },
			},
			{
				displayName: 'Count',
				name: 'count',
				type: 'string',
				default: '',
				validateType: 'string',
				displayOptions: { show: { mode: ['a'] } },
			},
			{
				displayName: 'Unchecked',
				name: 'loose',
				type: 'string',
				default: '',
				validateType: 'number',
				ignoreValidationDuringExecution: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 1,
						validateType: 'number',
					},
					{ displayName: 'Free', name: 'free', type: 'string', default: '' },
				],
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'resourceMapper',
				default: {},
				typeOptions: { resourceMapper: { mode: 'add', showTypeConversionOptions: true } },
			},
		],
	} as unknown as NodeDescription;

	it('takes the property that v1 shows for the parameters of the node', () => {
		expect(parameterValidationOf(description, { mode: 'a' }, 1, 'count')).toEqual({
			type: 'string',
			label: 'Count',
			own: { type: 'string', label: 'Count' },
		});
		expect(parameterValidationOf(description, { mode: 'b' }, 1, 'count')?.own?.type).toBe('number');
		expect(parameterValidationOf(description, { mode: 'c' }, 1, 'count')).toBeUndefined();
		expect(parameterValidationOf(description, {}, 1, 'loose')?.own).toBeUndefined();
	});

	it('lists the checked members of a collection and the options of a mapper', () => {
		expect(parameterValidationOf(description, {}, 1, 'options')?.members).toEqual({
			limit: { type: 'number', label: 'Limit' },
		});
		expect(parameterValidationOf(description, {}, 1, 'columns')?.mapper).toEqual({
			adds: true,
			conversions: true,
			strings: false,
		});
	});
});

describe('the plan of a check', () => {
	const none = () => false;

	it('needs no run-time check for a value with a known type', () => {
		expect(fieldNeed('number', 5, true, false, undefined)).toBe('none');
		expect(fieldNeed('number', '5', true, false, undefined)).toBe('run');
		expect(fieldNeed('string', 5, true, false, undefined)).toBe('none');
		expect(fieldNeed('string', 5, true, true, undefined)).toBe('run');
		expect(fieldNeed('string', null, true, false, undefined)).toBe('run');
		expect(fieldNeed('object', {}, true, false, undefined)).toBe('none');
		expect(fieldNeed('dateTime', '2024-01-01', true, false, undefined)).toHaveProperty('refuse');
	});

	it('makes no check for a mapper without a schema or for another path', () => {
		const rule: ParameterValidation = {
			type: 'resourceMapper',
			label: 'Columns',
			mapper: { adds: true, conversions: true, strings: false },
		};
		const field = {
			mappingMode: 'defineBelow',
			value: { a: '1' },
			schema: [{ id: 'a', type: 'number' }],
		};
		expect(planValidation(rule, 'columns', field, field, none, false)).toBeUndefined();
		expect(planValidation(rule, 'columns.value.a', '1', field, none, false)).toBeUndefined();
		expect(
			planValidation(rule, 'columns.value', field.value, { ...field, schema: null }, none, false),
		).toBeUndefined();
		expect(planValidation(rule, 'columns.value', field.value, field, none, false)).toEqual({
			helper: '__validMapped',
			args: [[['a', 'number', false, null]], true, false],
		});
	});
});

describe('the cases of the verifier for validation', () => {
	const node = {
		description: {
			name: 'acme',
			version: 1,
			properties: [
				{
					displayName: 'Columns',
					name: 'columns',
					type: 'resourceMapper',
					default: { mappingMode: 'defineBelow', value: null },
				},
				{
					displayName: 'Count',
					name: 'count',
					type: 'string',
					default: '',
					validateType: 'number',
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					options: [
						{
							displayName: 'Limit',
							name: 'limit',
							type: 'number',
							default: 1,
							validateType: 'number',
						},
					],
				},
			],
		} as unknown as NodeDescription & { version: number },
	};
	const expression = (field: string) => `={{ $json.${field} }}`;

	it('fills a checked parameter with a value of its type', () => {
		expect(requiredParameters(node, 1, {}).count).toBe(1);
	});

	it('gives a mapper a typed schema, values to cast, values to reject and the options', () => {
		const variants = parameterVariants(node, 1, {}, {}, [], expression);
		const mapper = variants.find((variant) => variant.name === 'columns');
		const values = (mapper?.values ?? []) as Array<Record<string, unknown>>;
		const schema = values[0].schema as Array<{ id: string; type: string }>;
		expect(schema.map((entry) => entry.type)).toEqual([
			'string',
			'number',
			'boolean',
			'time',
			'array',
			'options',
		]);
		expect(values.some((value) => value.attemptToConvertTypes === true)).toBe(true);
		expect(values.some((value) => value.convertFieldsToString === true)).toBe(true);
		expect(values.some((value) => (value.value as { count: unknown }).count === 'x')).toBe(true);
		expect(mapper?.form?.fields.columns_count).toEqual(['5', 6, '7']);
		expect(mapper?.rejected?.fields.columns_count).toEqual(['5', null, 'x']);
	});

	it('gives a checked member a value of the wrong type', () => {
		const variants = parameterVariants(node, 1, {}, {}, [], expression);
		const limit = variants.find((variant) => variant.condition === 'options.limit');
		expect(limit?.values).toEqual([2, 7, '8', 'x']);
		expect(limit?.rejected?.fields.options_limit).toEqual(['7', 8, 'x']);
		expect(checkedSamples({ validateType: 'options', options: [{ value: 'a' }] })?.values).toEqual([
			'a',
			'not-a-choice',
		]);
		expect(
			checkedSamples({ validateType: 'number', ignoreValidationDuringExecution: true }),
		).toBeUndefined();
	});
});
