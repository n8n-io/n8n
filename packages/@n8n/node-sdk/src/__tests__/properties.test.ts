import {
	getNodeParameters,
	getNodeParametersIssues,
	type IExecuteFunctions,
	type INodeParameters,
	type INodeProperties,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { nodeDescriptionOf, nodeParametersOf } from '../entry/host';
import {
	checkAction,
	contractHash,
	missingTitlesOf,
	parseManifest,
	toContract,
} from '../entry/registry';
import { defineNode, defineResource, ref, t, type Action } from '../index';
import { toolUiOf } from '../properties';
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
			'channel | Channel | string | placeholder=#general',
			'text | Text | string | typeOptions={"rows":6}',
			'options | Options | collection | placeholder=Add option',
			'  blocks | Blocks | json',
			'  appendAttribution | Include link to workflow | boolean',
			'  threadTs | Thread | string',
			'  replyBroadcast | Also send to channel | boolean',
		]);
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
		];
		expect(typed).toHaveLength(8);
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
	it('lists the form fields without a title, and the gate is off', () => {
		const untitled = web.action('untitled', {
			action: 'Untitled',
			summary: 'Fields without titles.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {
				name: t.str(),
				label: t.str().title('Label'),
				body: t.variant('kind', { text: { text: t.str() } }).title('Body'),
			},
			output: t.json(),
			async run() {
				return await Promise.resolve({});
			},
		});
		expect(missingTitlesOf(toContract(untitled))).toEqual([
			'web.untitled: input.name has no title',
			'web.untitled: input.body.text has no title',
		]);
		expect(missingTitlesOf(toContract(sendRequest))).toEqual([]);
		expect(checkAction(untitled).filter((issue) => issue.includes('has no title'))).toEqual([]);
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
