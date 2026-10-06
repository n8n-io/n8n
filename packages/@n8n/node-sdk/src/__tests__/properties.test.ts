import {
	getNodeParameters,
	getNodeParametersIssues,
	type IExecuteFunctions,
	type INodeParameters,
	type INodeProperties,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	advancedFieldsOf,
	contractInputOf,
	contractParametersOf,
	jsonFieldPathsOf,
	nodeDescriptionOf,
	nodeParametersOf,
	storedParametersOf,
	toolUiOf,
} from '../entry/host';
import {
	checkAction,
	contractHash,
	missingTitlesOf,
	parseManifest,
	toContract,
} from '../entry/registry';
import { defineNode, defineResource, ref, t, where, type Action, type Where } from '../index';
import { toNodeType } from '../runtime';

const slack = defineNode({ id: 'slack', displayName: 'Slack', baseUrl: 'https://slack.com/api' });
const slackConversation = defineResource({
	id: 'slack.conversation',
	label: 'Conversation',
	shape: { pattern: '^#?[a-z0-9_-]{1,80}$', examples: ['#general'] },
});
const block = t.obj({ type: t.str() }).with({ additionalProperties: true });

/** The input of Slack `message.send`, with titles. It echoes its input. */
const sendMessage = slack.resource('message').action('send', {
	action: 'Send a message',
	summary: 'Post a message to a Slack channel, a DM or a thread.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	input: {
		channel: ref(slackConversation).title('Channel'),
		text: t.str().with({ minLength: 1 }).title('Text').hint('Slack mrkdwn, e.g. *bold*'),
		blocks: t.arr(block).title('Blocks').optional(),
		appendAttribution: t.bool().default(true).title('Include link to workflow'),
		threadTs: t.str().with({ pattern: '^[0-9]+\\.[0-9]+$' }).title('Thread').optional(),
		replyBroadcast: t.bool().default(false).title('Also send to channel'),
	},
	ui: {
		order: ['channel', 'text'],
		advanced: ['blocks', 'appendAttribution', 'threadTs', 'replyBroadcast'],
		fields: { text: { widget: 'textarea', config: { rows: 6 } }, blocks: { widget: 'json' } },
	},
	output: t.json(),
	async run({ input }) {
		return await Promise.resolve({ ...input });
	},
});

const web = defineNode({ id: 'web', displayName: 'Web' });

const requestInput = {
	method: t
		.oneOf('POST', 'PUT')
		.options({ POST: 'Create', PUT: { name: 'Replace', description: 'Sends the whole item' } })
		.default('POST')
		.title('Method'),
	timeout: t.int().with({ minimum: 1, maximum: 300 }).title('Timeout').optional(),
	body: t
		.variant(
			'kind',
			{
				json: { json: t.json().title('JSON') },
				text: {
					text: t.str().title('Text'),
					contentType: t
						.str()
						.title('Content type')
						.with({ examples: ['text/plain'] }),
				},
				form: { fields: t.record(t.str()).title('Fields'), contentType: t.str().title('Type') },
			},
			{ json: 'JSON', text: 'Raw text', form: { name: 'Form', description: 'URL-encoded' } },
		)
		.title('Body')
		.optional(),
};

/** A request with an enum, limits and a variant body. It echoes its input. */
const sendRequest = web.action('send', {
	action: 'Send a request',
	summary: 'Send an HTTP request.',
	flow: { effect: 'write', cardinality: 'per-item' },
	input: requestInput,
	ui: {
		order: ['body'],
		fields: {
			'body.text': { widget: 'textarea' },
			'body.contentType': { placeholder: 'text/csv' },
		},
	},
	output: t.json(),
	async run({ input }) {
		return await Promise.resolve({ ...input });
	},
});

/** The same request with the body as one JSON field. */
const sendRequestJson = web.action('sendJson', {
	action: 'Send a request',
	summary: 'Send an HTTP request.',
	flow: { effect: 'write', cardinality: 'per-item' },
	input: requestInput,
	ui: { fields: { body: { widget: 'json' } } },
	output: t.json(),
	async run({ input }) {
		return await Promise.resolve({ ...input });
	},
});

/** Routes by `where` in the n8n filter. It echoes its input. */
const route = web.action('route', {
	action: 'Route items',
	summary: 'Route items by conditions.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { where },
	ui: { fields: { where: { widget: 'filter' } } },
	output: t.json(),
	async run({ input }) {
		return await Promise.resolve({ ...input });
	},
});

/** Sets fields, with headers as one more record. It echoes its input. */
const edit = web.action('edit', {
	action: 'Edit fields',
	summary: 'Set fields on each item.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { fields: t.record(t.jsonValue()), headers: t.record(t.str()).optional() },
	ui: { fields: { fields: { widget: 'assignments' }, headers: { widget: 'assignments' } } },
	output: t.json(),
	async run({ input }) {
		return await Promise.resolve({ ...input });
	},
});

/** Sorts by fields and routes by cases, each case with a filter. It echoes its input. */
const sortRoute = web.action('sortRoute', {
	action: 'Sort and route',
	summary: 'Sort items, then route them by cases.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		by: t.arr(
			t.obj({
				field: t.str(),
				order: t.oneOf('ascending', 'descending').default('ascending'),
			}),
		),
		cases: t.arr(t.obj({ output: t.str(), where })).optional(),
	},
	ui: {
		fields: {
			by: { widget: 'list' },
			cases: { widget: 'list' },
			'cases.where': { widget: 'filter' },
		},
	},
	output: t.json(),
	async run({ input }) {
		return await Promise.resolve({ ...input });
	},
});

/** Name, label, type and the extra keys of each property; collection options are indented. */
const rowsOf = (properties: readonly INodeProperties[], indent = ''): string[] =>
	properties.flatMap((property) => {
		const { name, displayName, type, placeholder, typeOptions, displayOptions, options } = property;
		const extra = [
			...(placeholder ? [`placeholder=${placeholder}`] : []),
			...(typeOptions ? [`typeOptions=${JSON.stringify(typeOptions)}`] : []),
			...(displayOptions?.show ? [`show=${JSON.stringify(displayOptions.show)}`] : []),
			...(type === 'options'
				? [
						`options=${(options ?? [])
							.map((option) => ('value' in option ? `${option.name}:${String(option.value)}` : ''))
							.join(',')}`,
					]
				: []),
		];
		const row = [`${indent}${name}`, displayName, type, ...extra].join(' | ');
		const children =
			type === 'collection'
				? rowsOf(
						(options ?? []).filter((option): option is INodeProperties => 'type' in option),
						`${indent}  `,
					)
				: [];
		return [row, ...children];
	});

const descriptionOf = (action: Action) => new (toNodeType(action))().description;

const sheets = defineNode({ id: 'sheets', displayName: 'Sheets', baseUrl: 'https://sheets.test' });
const spreadsheet = defineResource({
	id: 'sheets.spreadsheet',
	label: 'Spreadsheet',
	shape: { pattern: '^[a-z0-9]+$' },
	list: {
		request: { path: '/files', query: { q: { input: 'search' } } },
		response: t.obj({ files: t.arr(t.obj({ id: t.str(), name: t.str() })) }),
		items: 'files',
		item: { id: '{id}', label: '{name}' },
		search: 'service',
	},
});
const sheet = defineResource({
	id: 'sheets.sheet',
	label: 'Sheet',
	shape: { pattern: '^[0-9]+$' },
	input: { spreadsheet: ref(spreadsheet) },
	list: {
		request: { path: '/{spreadsheet}' },
		response: t.obj({
			sheets: t.arr(t.obj({ properties: t.obj({ sheetId: t.int(), title: t.str() }) })),
		}),
		items: 'sheets',
		item: { id: '{properties.sheetId}', label: '{properties.title}' },
	},
});
const owner = defineResource({ id: 'sheets.owner', label: 'Owner', shape: { minLength: 1 } });

/** Reads a row of a sheet in a spreadsheet. It echoes its input. */
const readRow = sheets.resource('row').action('read', {
	action: 'Read a row',
	summary: 'Read one row of a sheet.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {
		spreadsheet: ref(spreadsheet).title('Spreadsheet'),
		tab: t
			.variant('by', { id: { id: ref(sheet).title('Sheet') }, name: { name: t.str() } })
			.title('Tab'),
		owner: ref(owner).title('Owner').optional(),
	},
	output: t.json(),
	async run({ input }) {
		return await Promise.resolve({ ...input });
	},
});

/** Runs the node type as n8n does: n8n fills the description defaults into the parameters. */
async function runInputOf(action: Action, stored: Readonly<Record<string, unknown>>) {
	const NodeType = toNodeType(action);
	const nodeType = new NodeType();
	const { description } = nodeType;
	const parameters = getNodeParameters(
		description.properties,
		stored as INodeParameters,
		true,
		false,
		null,
		description,
	);
	const read = (path: string) =>
		path
			.split('.')
			.reduce<unknown>(
				(value, key) =>
					typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined,
				parameters,
			);
	const context = {
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: action.id, credentials: {} }),
		getNodeParameter: (path: string, _itemIndex: number, fallback?: unknown) => {
			const value = read(path) ?? fallback;
			if (value === undefined) throw new Error(`Could not get parameter "${path}"`);
			return value;
		},
		continueOnFail: () => false,
		addExecutionHints: () => undefined,
	};
	// The runtime reads only these members.
	const outputs = await nodeType.execute?.call(context as unknown as IExecuteFunctions);
	return { parameters, input: Array.isArray(outputs) ? outputs[0]?.[0]?.json : undefined };
}

describe('nodeDescriptionOf', () => {
	it('shows the Slack message.send probe with titles, order, widgets and an Options collection', () => {
		expect(rowsOf(descriptionOf(sendMessage).properties)).toEqual([
			'channel | Channel | resourceLocator',
			'text | Text | string | typeOptions={"rows":6}',
			'options | Options | collection | placeholder=Add option',
			'  blocks | Blocks | json',
			'  appendAttribution | Include link to workflow | boolean',
			'  threadTs | Thread | string',
			'  replyBroadcast | Also send to channel | boolean',
		]);
	});

	it('shows a ref field as a resource locator: the list of its lookup, then the ID', () => {
		const [field, tab, ownerField] = descriptionOf(readRow).properties;
		expect(field).toMatchObject({
			name: 'spreadsheet',
			type: 'resourceLocator',
			required: true,
			default: { mode: 'list', value: '' },
			modes: [
				{
					name: 'list',
					type: 'list',
					typeOptions: { searchListMethod: 'sheets.spreadsheet', searchable: true },
				},
				{ name: 'id', type: 'string' },
			],
		});
		const [, sheetField] = tab?.options ?? [];
		expect(sheetField).toMatchObject({
			name: 'id',
			type: 'resourceLocator',
			typeOptions: { loadOptionsDependsOn: ['spreadsheet'] },
			modes: [
				{ name: 'list', typeOptions: { searchListMethod: 'sheets.sheet', searchable: false } },
				{ name: 'id' },
			],
		});
		// A resource without a lookup takes the ID only.
		expect(ownerField).toMatchObject({
			type: 'resourceLocator',
			default: { mode: 'id', value: '' },
			modes: [{ name: 'id' }],
		});
	});

	it('shows option labels, number limits, and a variant as a tag dropdown with fields per tag', () => {
		expect(rowsOf(descriptionOf(sendRequest).properties)).toEqual([
			'body | Body | collection | placeholder=Add field',
			'  kind | Body | options | options=JSON:json,Raw text:text,Form:form',
			'  json | JSON | json | show={"kind":["json"]}',
			'  text | Text | string | typeOptions={"rows":4} | show={"kind":["text"]}',
			'  contentType | Content type | string | placeholder=text/csv | show={"kind":["text"]}',
			'  fields | Fields | json | show={"kind":["form"]}',
			'  contentType | Type | string | placeholder=text/csv | show={"kind":["form"]}',
			'method | Method | options | options=Create:POST,Replace:PUT',
			'timeout | Timeout | number | typeOptions={"minValue":1,"maxValue":300}',
		]);
		const method = descriptionOf(sendRequest).properties.find(({ name }) => name === 'method');
		expect(method?.options?.[1]).toEqual({
			name: 'Replace',
			value: 'PUT',
			description: 'Sends the whole item',
		});
	});

	it('keeps one property for a field that several branches share with the same schema', () => {
		const shared = web.action('shared', {
			action: 'Shared',
			summary: 'Shared branch fields.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {
				mode: t.variant('by', {
					id: { id: t.str(), limit: t.int() },
					name: { name: t.str(), limit: t.int() },
				}),
			},
			output: t.json(),
			async run() {
				return await Promise.resolve({});
			},
		});
		expect(rowsOf(descriptionOf(shared).properties)).toEqual([
			'mode | mode | collection | placeholder=Add field',
			'  by | mode | options | options=id:id,name:name',
			'  id | id | string | show={"by":["id"]}',
			'  limit | limit | number | show={"by":["id","name"]}',
			'  name | name | string | show={"by":["name"]}',
		]);
		expect(descriptionOf(shared).properties[0]?.default).toEqual({ by: 'id' });
	});

	it('keeps a variant and every field at the top in the form of an agent tool', () => {
		const contract = toContract(sendRequest);
		const tool = nodeDescriptionOf({
			contract,
			nodeContract: '2.1.0',
			ui: toolUiOf(contract.input, sendRequest.ui),
		});
		expect(tool.properties.map(({ name, type }) => `${name} ${type}`)).toEqual([
			'body json',
			'method options',
			'timeout number',
		]);
		expect(tool.properties[0]).not.toHaveProperty('placeholder');
		const slackTool = nodeDescriptionOf({
			contract: toContract(sendMessage),
			nodeContract: '2.1.0',
			ui: toolUiOf(toContract(sendMessage).input, sendMessage.ui),
		});
		expect(slackTool.properties.map(({ name }) => name)).not.toContain('options');
	});
});

describe('ui', () => {
	it('is not in the contract hash, and the manifest keeps it', () => {
		const plain = defineNode({ id: 'web', displayName: 'Web' }).action('send', {
			action: 'Send',
			summary: 'Send.',
			flow: { effect: 'write', cardinality: 'per-item' },
			input: {
				method: t.oneOf('POST', 'PUT').default('POST'),
				timeout: t.int().with({ minimum: 1, maximum: 300 }).optional(),
				body: t
					.variant('kind', {
						json: { json: t.json() },
						text: { text: t.str(), contentType: t.str() },
						form: { fields: t.record(t.str()), contentType: t.str() },
					})
					.optional(),
			},
			output: t.json(),
			async run() {
				return await Promise.resolve({});
			},
		});
		const contract = toContract(sendRequest);
		expect(contractHash(contract)).toBe(contractHash(toContract(plain)));
		const manifest = {
			kind: 'action',
			id: contract.id,
			semver: '1.0.0',
			nodeContract: '2.1.0',
			contractHash: contractHash(contract),
			bundleHash: 'a'.repeat(64),
			contract,
			ui: sendRequest.ui,
		};
		expect(parseManifest(JSON.stringify(manifest)).ui).toEqual(sendRequest.ui);
	});

	it('types its keys from the input', () => {
		const spec = {
			action: 'Typed',
			summary: 'Typed ui keys.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {
				text: t.str(),
				count: t.int().optional(),
				body: t.variant('kind', { text: { text: t.str() }, json: { json: t.json() } }).optional(),
				auth: t.variant('type', { key: { key: t.str() } }).default({ type: 'key', key: '' }),
				pair: t.nullable(t.obj({ left: t.str() })).optional(),
			},
			output: t.json(),
			async run() {
				return await Promise.resolve({});
			},
		} as const;
		const typed = [
			web.action('a', { ...spec, ui: { order: ['count', 'text'], advanced: ['count', 'body'] } }),
			web.action('b', { ...spec, ui: { fields: { 'body.text': { widget: 'textarea' } } } }),
			web.action('c', { ...spec, ui: { fields: { body: { widget: 'json' } } } }),
			// @ts-expect-error `txt` is not an input field
			web.action('d', { ...spec, ui: { order: ['txt'] } }),
			// @ts-expect-error a required field cannot go into the Options collection
			web.action('e', { ...spec, ui: { advanced: ['text'] } }),
			// @ts-expect-error a textarea edits a string, not a number
			web.action('f', { ...spec, ui: { fields: { count: { widget: 'textarea' } } } }),
			// @ts-expect-error `body.txt` is no field of a branch
			web.action('g', { ...spec, ui: { fields: { 'body.txt': { placeholder: 'x' } } } }),
			web.action('h', {
				...spec,
				// @ts-expect-error a textarea has no `lines`
				ui: { fields: { text: { widget: 'textarea', config: { lines: 2 } } } },
			}),
			web.action('i', { ...spec, ui: { fields: { 'auth.key': { widget: 'textarea' } } } }),
			// @ts-expect-error a nullable object renders as JSON, so it has no sub-field
			web.action('j', { ...spec, ui: { fields: { 'pair.left': { placeholder: 'x' } } } }),
		];
		expect(typed).toHaveLength(10);
	});
});

describe('node parameters', () => {
	it('reads back the contract value that nodeParametersOf stores', async () => {
		const value = {
			channel: '#general',
			text: 'Hi',
			blocks: [{ type: 'divider' }],
			appendAttribution: false,
			threadTs: '1700000000.000100',
			replyBroadcast: true,
		};
		const stored = nodeParametersOf(value, sendMessage.inputSchema, sendMessage.ui);
		const { parameters, input } = await runInputOf(sendMessage, stored);
		expect(parameters).toMatchObject({
			channel: '#general',
			options: { threadTs: value.threadTs },
		});
		expect(input).toEqual(value);
	});

	it('reads the ID of a resource locator, also in a variant branch, and a plain ID', async () => {
		const locator = (mode: string, value: string) => ({ __rl: true, mode, value });
		const { input } = await runInputOf(readRow, {
			spreadsheet: locator('list', 'abc'),
			tab: { by: 'id', id: locator('id', '7') },
			owner: 'ada',
		});
		expect(input).toEqual({ spreadsheet: 'abc', tab: { by: 'id', id: '7' }, owner: 'ada' });
	});

	it('reads an unset advanced field as unset, so its default applies', async () => {
		const stored = nodeParametersOf(
			{ channel: '#general', text: 'Hi' },
			sendMessage.inputSchema,
			sendMessage.ui,
		);
		const { input } = await runInputOf(sendMessage, stored);
		expect(input).toEqual({
			channel: '#general',
			text: 'Hi',
			appendAttribution: true,
			replyBroadcast: false,
		});
	});

	it('reads back each variant branch, and JSON text in a branch field', async () => {
		const values = [
			{ method: 'PUT', body: { kind: 'text', text: 'a,b', contentType: 'text/csv' } },
			{ method: 'POST', timeout: 30, body: { kind: 'form', fields: { a: '1' }, contentType: 'x' } },
			{ method: 'POST', body: { kind: 'json', json: { a: 1 } } },
		];
		const read = await Promise.all(
			values.map(
				async (value) =>
					(await runInputOf(sendRequest, nodeParametersOf(value, sendRequest.inputSchema))).input,
			),
		);
		expect(read).toEqual(values);
		const edited = await runInputOf(sendRequest, { body: { kind: 'json', json: '{"a":2}' } });
		expect(edited.input).toEqual({ method: 'POST', body: { kind: 'json', json: { a: 2 } } });
		const unset = await runInputOf(sendRequest, {});
		expect(unset.input).toEqual({ method: 'POST' });
	});

	it('reads back a json-widget variant as text or object, and a form variant as object', async () => {
		const value = { kind: 'json', json: { a: 1 } };
		const stored = [
			{ body: JSON.stringify(value) },
			{ body: value },
			{ body: value },
			{ body: { kind: 'json', json: '{"a":1}' } },
		];
		const read = await Promise.all(
			[sendRequestJson, sendRequestJson, sendRequest, sendRequest].map(
				async (action, index) => (await runInputOf(action, stored[index] ?? {})).input,
			),
		);
		expect(read).toEqual(read.map(() => ({ method: 'POST', body: value })));
	});
});

describe('jsonFieldPathsOf', () => {
	it('lists the fields whose JSON editor keeps an edit as text, which the run reads as its value', async () => {
		expect(jsonFieldPathsOf(sendMessage.inputSchema, sendMessage.ui)).toEqual([['blocks']]);
		expect(jsonFieldPathsOf(sendRequest.inputSchema, sendRequest.ui)).toEqual([
			['body', 'json'],
			['body', 'fields'],
		]);
		expect(jsonFieldPathsOf(sendRequestJson.inputSchema, sendRequestJson.ui)).toEqual([['body']]);
		const toolUi = toolUiOf(sendRequest.inputSchema, sendRequest.ui);
		expect(jsonFieldPathsOf(sendRequest.inputSchema, toolUi)).toEqual([['body']]);
		const edited = { channel: '#general', text: 'Hi', options: { blocks: '[{"type":"divider"}]' } };
		const { input } = await runInputOf(sendMessage, edited);
		expect(input).toMatchObject({ blocks: [{ type: 'divider' }] });
	});
});

describe('contractInputOf', () => {
	it('reads a JSON-text field, an Options field and a plain field as the run reads them', async () => {
		const stored = {
			channel: '#general',
			text: '={{ $json.text }}',
			options: { blocks: '[{"type":"divider"}]', threadTs: '', replyBroadcast: true },
			authentication: 'slackApi',
		};
		const expected = {
			channel: '#general',
			text: '={{ $json.text }}',
			blocks: [{ type: 'divider' }],
			replyBroadcast: true,
		};
		expect(contractInputOf(stored, sendMessage.inputSchema, sendMessage.ui)).toEqual(expected);
		const { input } = await runInputOf(sendMessage, { ...stored, text: 'Hi' });
		expect(input).toMatchObject({ ...expected, text: 'Hi' });
	});

	it('reads a tool form, which keeps every field at the top and a variant as JSON text', () => {
		const toolUi = toolUiOf(sendRequest.inputSchema, sendRequest.ui);
		const stored = { method: 'PUT', body: '{"kind":"json","json":{"a":1}}', timeout: '' };
		expect(contractInputOf(stored, sendRequest.inputSchema, toolUi)).toEqual({
			method: 'PUT',
			body: { kind: 'json', json: { a: 1 } },
		});
	});
});

describe('the filter widget', () => {
	const value: Where = {
		match: 'any',
		conditions: [
			{ type: 'number', left: 20, test: { op: 'gte', right: 18 } },
			{ type: 'string', left: '={{ $json.name }}', test: { op: 'notEmpty' } },
			{ type: 'array', left: ['a', 'b'], test: { op: 'lengthGt', right: 1 } },
			{ type: 'boolean', left: null, test: { op: 'true' } },
		],
		ignoreCase: true,
	};
	const filterValue = {
		conditions: [
			{
				id: '0',
				leftValue: 20,
				rightValue: 18,
				operator: { type: 'number', operation: 'gte' },
			},
			{
				id: '1',
				leftValue: '={{ $json.name }}',
				rightValue: '',
				operator: { type: 'string', operation: 'notEmpty', singleValue: true },
			},
			{
				id: '2',
				leftValue: ['a', 'b'],
				rightValue: 1,
				operator: { type: 'array', operation: 'lengthGt', rightType: 'number' },
			},
			{
				id: '3',
				leftValue: null,
				rightValue: '',
				operator: { type: 'boolean', operation: 'true', singleValue: true },
			},
		],
		combinator: 'or',
		options: { caseSensitive: false, leftValue: '', typeValidation: 'strict', version: 2 },
	};

	it('shows the n8n filter and stores its value', () => {
		expect(rowsOf(descriptionOf(route).properties)).toEqual(['where | Conditions | filter']);
		expect(nodeParametersOf({ where: value }, route.inputSchema, route.ui)).toEqual({
			where: filterValue,
		});
	});

	it('reads the stored filter value, its JSON text, a where value, and where JSON text as the where value', async () => {
		const stored = [
			{ where: filterValue },
			{ where: JSON.stringify(filterValue) },
			{ where: value },
			{ where: JSON.stringify(value) },
		];
		for (const parameters of stored) {
			expect(contractInputOf(parameters, route.inputSchema, route.ui)).toEqual({ where: value });
			expect((await runInputOf(route, parameters)).input).toEqual({ where: value });
		}
		const none = { ...value, conditions: [] };
		expect((await runInputOf(route, { where: none })).input).toEqual({ where: none });
	});

	it('reads a condition that the editor adds with the defaults of where', async () => {
		const added = {
			conditions: [
				{
					id: 'b1c4',
					leftValue: '',
					rightValue: 'Ada',
					operator: { type: 'string', operation: 'equals' },
				},
			],
			combinator: 'and',
			options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
		};
		const read = { conditions: [{ type: 'string', test: { op: 'equals', right: 'Ada' } }] };
		expect(contractInputOf({ where: added }, route.inputSchema, route.ui)).toEqual({ where: read });
		expect((await runInputOf(route, { where: added })).input).toEqual({
			where: { ...read, match: 'all', ignoreCase: false },
		});
	});

	it('stores the where value in the node parameters and reads it back, and keeps other parameters', () => {
		const { inputSchema, ui } = route;
		for (const where of [value, filterValue, JSON.stringify(value)]) {
			expect(storedParametersOf({ where, note: 'a' }, inputSchema, ui)).toEqual({
				where: filterValue,
				note: 'a',
			});
		}
		expect(contractParametersOf({ where: filterValue, note: 'a' }, inputSchema, ui)).toEqual({
			where: value,
			note: 'a',
		});
		expect(storedParametersOf({ where: '={{ $json.where }}' }, inputSchema, ui)).toEqual({
			where: '={{ $json.where }}',
		});
	});

	it('keeps the field JSON in the tool form', () => {
		const toolUi = toolUiOf(route.inputSchema, route.ui);
		expect(toolUi.fields).toEqual({ where: { widget: 'json' } });
		expect(contractInputOf({ where: JSON.stringify(value) }, route.inputSchema, toolUi)).toEqual({
			where: value,
		});
	});
});

describe('the assignments widget', () => {
	const fields = {
		name: 'Ada',
		age: 36,
		admin: false,
		tags: ['a'],
		address: { city: 'London' },
		manager: null,
		email: '={{ $json.email }}',
	};
	const assignments = [
		{ id: '0', name: 'name', value: 'Ada', type: 'string' },
		{ id: '1', name: 'age', value: 36, type: 'number' },
		{ id: '2', name: 'admin', value: false, type: 'boolean' },
		{ id: '3', name: 'tags', value: '["a"]', type: 'array' },
		{ id: '4', name: 'address', value: '{"city":"London"}', type: 'object' },
		{ id: '5', name: 'manager', value: 'null', type: 'object' },
		{ id: '6', name: 'email', value: '={{ $json.email }}', type: 'string' },
	];

	it('shows n8n assignments and stores one per key', () => {
		expect(rowsOf(descriptionOf(edit).properties)).toEqual([
			'fields | fields | assignmentCollection',
			'headers | headers | assignmentCollection',
		]);
		expect(descriptionOf(edit).properties.map((property) => property.default)).toEqual([{}, '']);
		expect(nodeParametersOf({ fields }, edit.inputSchema, edit.ui)).toEqual({
			fields: { assignments },
		});
	});

	it('reads the stored assignments, a record and record JSON text as the record', async () => {
		const read = { ...fields, email: '={{ $json.email }}' };
		for (const stored of [{ assignments }, fields, JSON.stringify(fields)]) {
			expect(contractInputOf({ fields: stored }, edit.inputSchema, edit.ui)).toEqual({
				fields: read,
			});
			expect((await runInputOf(edit, { fields: stored })).input).toEqual({ fields: read });
		}
		const typed = [{ id: 'x', name: 'Accept', value: 'json', type: 'string' }];
		const { input } = await runInputOf(edit, {
			fields: { assignments: [] },
			headers: { assignments: typed },
		});
		expect(input).toEqual({ fields: {}, headers: { Accept: 'json' } });
	});

	it('finds no issue in the stored parameters', () => {
		const description = descriptionOf(edit);
		const node = {
			id: '1',
			name: 'Edit',
			type: description.name,
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: nodeParametersOf({ fields }, edit.inputSchema, edit.ui) as INodeParameters,
		};
		expect(getNodeParametersIssues(description.properties, node, description)).toBeNull();
	});
});

describe('the list widget', () => {
	const by = [{ field: 'name' }, { field: 'age', order: 'descending' }];
	const where: Where = {
		conditions: [{ type: 'string', left: 'a', test: { op: 'equals', right: 'a' } }],
	};
	const filterValue = {
		conditions: [
			{
				id: '0',
				leftValue: 'a',
				rightValue: 'a',
				operator: { type: 'string', operation: 'equals' },
			},
		],
		combinator: 'and',
		options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
	};

	it('shows rows of the item fields, with the widget of an item field', () => {
		const [byProperty, casesProperty] = descriptionOf(sortRoute).properties;
		expect(byProperty).toMatchObject({
			name: 'by',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true, sortable: true },
			default: {},
		});
		const rows = (property: INodeProperties | undefined) =>
			(property?.options ?? []).flatMap((option) =>
				'values' in option ? option.values.map(({ name, type }) => `${name} | ${type}`) : [],
			);
		expect(rows(byProperty)).toEqual(['field | string', 'order | options']);
		expect(rows(casesProperty)).toEqual(['output | string', 'where | filter']);
	});

	it('stores the rows and reads them back, with the stored value of an item widget', async () => {
		const cases = [{ output: 'a', where }];
		const stored = nodeParametersOf({ by, cases }, sortRoute.inputSchema, sortRoute.ui);
		expect(stored).toEqual({
			by: { values: by },
			cases: { values: [{ output: 'a', where: filterValue }] },
		});
		const expected = {
			by: [{ field: 'name', order: 'ascending' }, by[1]],
			cases: [{ output: 'a', where: { ...where, match: 'all', ignoreCase: false } }],
		};
		expect((await runInputOf(sortRoute, stored)).input).toEqual(expected);
		expect(contractInputOf(stored, sortRoute.inputSchema, sortRoute.ui)).toEqual({ by, cases });
	});

	it('reads a list stored as an array, but n8n drops it before a run', () => {
		expect(contractInputOf({ by }, sortRoute.inputSchema, sortRoute.ui)).toEqual({ by });
		const loaded = getNodeParameters(
			descriptionOf(sortRoute).properties,
			{ by } as INodeParameters,
			true,
			false,
			null,
			descriptionOf(sortRoute),
		);
		expect(loaded?.by).toEqual({});
	});

	it('reads a list without rows as unset when the field is optional', () => {
		expect(
			contractInputOf({ by: { values: by }, cases: {} }, sortRoute.inputSchema, sortRoute.ui),
		).toEqual({ by });
		expect(contractInputOf({ by: {} }, sortRoute.inputSchema, sortRoute.ui)).toEqual({ by: [] });
	});
});

describe('advancedFieldsOf', () => {
	it('lists the optional advanced fields in input order', () => {
		expect(advancedFieldsOf(sendMessage.inputSchema, sendMessage.ui)).toEqual([
			'blocks',
			'appendAttribution',
			'threadTs',
			'replyBroadcast',
		]);
		expect(advancedFieldsOf(sendRequest.inputSchema, sendRequest.ui)).toEqual([]);
	});
});

describe('getNodeParametersIssues', () => {
	it('finds no issue in the parameters of a contract value', () => {
		const issuesOf = (action: Action, value: Readonly<Record<string, unknown>>) => {
			const description = descriptionOf(action);
			const node = {
				id: '1',
				name: action.id,
				type: description.name,
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: nodeParametersOf(value, action.inputSchema, action.ui) as INodeParameters,
			};
			return getNodeParametersIssues(description.properties, node, description);
		};
		expect(
			issuesOf(sendRequest, { body: { kind: 'text', text: 'a', contentType: 'b' } }),
		).toBeNull();
		expect(issuesOf(sendMessage, { channel: '#a', text: 'b', threadTs: '1.2' })).toBeNull();
	});
});

describe('missingTitlesOf', () => {
	it('lists the input fields without a title at every depth, and checkAction refuses them', () => {
		const untitled = web.action('untitled', {
			action: 'Untitled',
			summary: 'Fields without titles.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {
				name: t.str(),
				label: t.str().title('Label'),
				body: t.variant('kind', { text: { text: t.str() } }).title('Body'),
				rows: t.arr(t.obj({ key: t.str(), value: t.str().title('Value') })).title('Rows'),
				limits: t.obj({ max: t.int() }).title('Limits'),
				match: t.union(t.obj({ id: t.str() }), t.str()).title('Match'),
			},
			output: t.json(),
			async run() {
				return await Promise.resolve({});
			},
		});
		expect(missingTitlesOf(toContract(untitled))).toEqual([
			'web.untitled: input.name has no title',
			'web.untitled: input.body.text has no title',
			'web.untitled: input.rows[].key has no title',
			'web.untitled: input.limits.max has no title',
			'web.untitled: input.match.id has no title',
		]);
		expect(missingTitlesOf(toContract(sendRequest))).toEqual([]);
		expect(checkAction(untitled).filter((issue) => issue.includes('has no title'))).toHaveLength(5);
	});

	it('checks the reply step of a native trigger', () => {
		const hook = web.trigger('hook', {
			trigger: 'On call',
			summary: 'Starts on a call.',
			input: { path: t.str().title('Path') },
			output: t.obj({}),
			native: { type: 'n8n-nodes-base.webhook', version: 2.2, on: 'webhook' },
			reply: {
				operation: 'respond',
				action: 'Respond',
				summary: 'Sends the reply.',
				native: { type: 'n8n-nodes-base.respondToWebhook', version: 1.5 },
				input: { body: t.str() },
			},
		});
		expect(checkAction(hook)).toEqual(['web.respond: input.body has no title']);
	});
});

describe('toNodeType', () => {
	it('describes the node as nodeDescriptionOf does from the manifest', () => {
		const description: INodeTypeDescription = descriptionOf(sendMessage);
		expect(
			nodeDescriptionOf({
				contract: toContract(sendMessage),
				nodeContract: '2.1.0',
				ui: sendMessage.ui,
			}),
		).toEqual(description);
	});
});
