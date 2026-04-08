import type { INodeProperties } from 'n8n-workflow';

import {
	extractNodeParametersSchema,
	isN8nExpression,
	validateNodeParameters,
	type NodeParametersSchema,
} from '../node-schema-utils';

describe('isN8nExpression', () => {
	it.each([
		['=some expression', true],
		['={{ $json.url }}', true],
		['{{ $json.url }}', true],
		['plain string', false],
		[42, false],
		[true, false],
		[null, false],
		[undefined, false],
	])('returns %s for %p', (value, expected) => {
		expect(isN8nExpression(value)).toBe(expected);
	});
});

describe('extractNodeParametersSchema', () => {
	it('includes string, number, boolean, options, json properties', () => {
		const props: INodeProperties[] = [
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{ displayName: 'Timeout', name: 'timeout', type: 'number', default: 30 },
			{ displayName: 'Active', name: 'active', type: 'boolean', default: false },
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				default: 'GET',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
			},
			{ displayName: 'Body', name: 'body', type: 'json', default: '' },
		];

		const schema = extractNodeParametersSchema(props);

		expect(Object.keys(schema)).toEqual(['url', 'timeout', 'active', 'method', 'body']);
		expect(schema.url.type).toBe('string');
		expect(schema.method.options).toEqual([
			{ name: 'GET', value: 'GET' },
			{ name: 'POST', value: 'POST' },
		]);
	});

	it('skips UI-only types: notice, callout, button, hidden, icon', () => {
		const props: INodeProperties[] = [
			{ displayName: 'Info', name: 'info', type: 'notice', default: '' },
			{ displayName: 'Alert', name: 'alert', type: 'callout', default: '' },
			{ displayName: 'Action', name: 'action', type: 'button', default: '' },
			{ displayName: 'Secret', name: 'secret', type: 'hidden', default: '' },
			{ displayName: 'Real', name: 'real', type: 'string', default: '' },
		];

		const schema = extractNodeParametersSchema(props);

		expect(Object.keys(schema)).toEqual(['real']);
	});

	it('skips credential-related types: credentialsSelect, credentials', () => {
		const props: INodeProperties[] = [
			{ displayName: 'Cred', name: 'cred', type: 'credentialsSelect', default: '' },
			{ displayName: 'Real', name: 'real', type: 'string', default: '' },
		];

		expect(Object.keys(extractNodeParametersSchema(props))).toEqual(['real']);
	});

	it('skips isNodeSetting properties', () => {
		const props: INodeProperties[] = [
			{ displayName: 'Setting', name: 'setting', type: 'string', default: '', isNodeSetting: true },
			{ displayName: 'Normal', name: 'normal', type: 'string', default: '' },
		];

		expect(Object.keys(extractNodeParametersSchema(props))).toEqual(['normal']);
	});

	it('marks properties with displayOptions as conditional', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				displayOptions: { show: { method: ['POST'] } },
			},
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
		];

		const schema = extractNodeParametersSchema(props);

		expect(schema.body.conditional).toBe(true);
		expect(schema.url.conditional).toBeUndefined();
	});

	it('propagates required flag', () => {
		const props: INodeProperties[] = [
			{ displayName: 'URL', name: 'url', type: 'string', default: '', required: true },
			{ displayName: 'Label', name: 'label', type: 'string', default: '' },
		];

		const schema = extractNodeParametersSchema(props);

		expect(schema.url.required).toBe(true);
		expect(schema.label.required).toBeUndefined();
	});

	it('includes min/max for number type from typeOptions', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 1, maxValue: 100 },
			},
		];

		const schema = extractNodeParametersSchema(props);

		expect(schema.count.min).toBe(1);
		expect(schema.count.max).toBe(100);
	});

	it('includes editor dialect for string type', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				typeOptions: { editor: 'sqlEditor' },
			},
		];

		expect(extractNodeParametersSchema(props).query.editor).toBe('sqlEditor');
	});

	it('expands collection fields recursively', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'collection',
				default: {},
				options: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		];

		const schema = extractNodeParametersSchema(props);

		expect(schema.headers.type).toBe('collection');
		expect(schema.headers.fields).toHaveProperty('name');
		expect(schema.headers.fields).toHaveProperty('value');
	});

	it('expands fixedCollection groups recursively', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Auth',
				name: 'auth',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Basic',
						name: 'basic',
						values: [
							{ displayName: 'User', name: 'user', type: 'string', default: '' },
							{ displayName: 'Pass', name: 'pass', type: 'string', default: '' },
						],
					},
				],
			},
		];

		const schema = extractNodeParametersSchema(props);

		expect(schema.auth.groups).toHaveProperty('basic');
		expect(schema.auth.groups!.basic.fields).toHaveProperty('user');
		expect(schema.auth.groups!.basic.fields).toHaveProperty('pass');
	});

	it('exposes resourceLocator modes as options', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Document',
				name: 'document',
				type: 'resourceLocator',
				default: { mode: 'url', value: '' },
				modes: [
					{ displayName: 'By URL', name: 'url', type: 'string' },
					{ displayName: 'By ID', name: 'id', type: 'string' },
				],
			},
		];

		const schema = extractNodeParametersSchema(props);

		expect(schema.document.options).toEqual([
			{ name: 'By URL', value: 'url' },
			{ name: 'By ID', value: 'id' },
		]);
	});

	it('remaps resourceMapper/filter/assignmentCollection to json type', () => {
		const props: INodeProperties[] = [
			{ displayName: 'Mapping', name: 'mapping', type: 'resourceMapper', default: {} },
			{ displayName: 'Filter', name: 'filter', type: 'filter', default: {} },
		];

		const schema = extractNodeParametersSchema(props);

		expect(schema.mapping.type).toBe('json');
		expect(schema.filter.type).toBe('json');
	});

	it('stores allowArbitraryValues flag', () => {
		const props: INodeProperties[] = [
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				default: 'GET',
				allowArbitraryValues: true,
				options: [{ name: 'GET', value: 'GET' }],
			},
		];

		expect(extractNodeParametersSchema(props).method.allowArbitraryValues).toBe(true);
	});
});

describe('validateNodeParameters', () => {
	const schema: NodeParametersSchema = {
		url: { displayName: 'URL', type: 'string', required: true },
		method: {
			displayName: 'Method',
			type: 'options',
			options: [
				{ name: 'GET', value: 'GET' },
				{ name: 'POST', value: 'POST' },
			],
		},
		timeout: { displayName: 'Timeout', type: 'number', min: 1, max: 300 },
		active: { displayName: 'Active', type: 'boolean' },
	};

	it('passes when all required params are present and valid', () => {
		const result = validateNodeParameters(schema, { url: 'https://example.com', method: 'GET' });

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('errors when a required non-conditional param is missing', () => {
		const result = validateNodeParameters(schema, {});

		expect(result.valid).toBe(false);
		expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('"url"')]));
	});

	it('does not error for missing required params that are conditional', () => {
		const schemaWithConditional: NodeParametersSchema = {
			...schema,
			url: { ...schema.url, conditional: true },
		};

		const result = validateNodeParameters(schemaWithConditional, {});

		expect(result.valid).toBe(true);
	});

	it('errors on invalid options value', () => {
		const result = validateNodeParameters(schema, {
			url: 'https://example.com',
			method: 'DELETE',
		});

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('"method"');
		expect(result.errors[0]).toContain('"DELETE"');
	});

	it('allows arbitrary values when allowArbitraryValues is set', () => {
		const flexSchema: NodeParametersSchema = {
			method: {
				displayName: 'Method',
				type: 'options',
				allowArbitraryValues: true,
				options: [{ name: 'GET', value: 'GET' }],
			},
		};

		expect(validateNodeParameters(flexSchema, { method: 'PATCH' }).valid).toBe(true);
	});

	it('errors on invalid multiOptions values', () => {
		const s: NodeParametersSchema = {
			tags: {
				displayName: 'Tags',
				type: 'multiOptions',
				options: [
					{ name: 'A', value: 'a' },
					{ name: 'B', value: 'b' },
				],
			},
		};

		const result = validateNodeParameters(s, { tags: ['a', 'c'] });

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('"tags"');
	});

	it('errors when number is below min', () => {
		const result = validateNodeParameters(schema, { url: 'x', timeout: 0 });

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('minimum 1');
	});

	it('errors when number exceeds max', () => {
		const result = validateNodeParameters(schema, { url: 'x', timeout: 999 });

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('maximum 300');
	});

	it('errors when number type receives a string', () => {
		const result = validateNodeParameters(schema, { url: 'x', timeout: 'fast' });

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('"timeout"');
	});

	it('errors when boolean type receives a string', () => {
		const result = validateNodeParameters(schema, { url: 'x', active: 'yes' });

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('"active"');
	});

	it('skips all type validation for n8n expression values', () => {
		const result = validateNodeParameters(schema, {
			url: '={{ $json.url }}',
			method: '=UNKNOWN_METHOD',
			timeout: '={{ $json.timeout }}',
			active: '={{ $json.active }}',
		});

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('warns about unknown parameters without erroring', () => {
		const result = validateNodeParameters(schema, { url: 'x', unknownParam: 'foo' });

		expect(result.valid).toBe(true);
		expect(result.warnings).toEqual(
			expect.arrayContaining([expect.stringContaining('"unknownParam"')]),
		);
	});
});
