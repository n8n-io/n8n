// Prototype fixtures: a few node types, cut down to the properties that the stories use, and
// pairs of node versions to compare. The node objects have the shape and the key order of a
// saved workflow, so the JSON view looks as it does in the app.
import type { INode, INodeTypeDescription } from 'n8n-workflow';

type Pair = { title: string; nodeType: INodeTypeDescription; before?: INode; after?: INode };

function description(
	name: string,
	displayName: string,
	version: number,
	properties: INodeTypeDescription['properties'],
): INodeTypeDescription {
	return {
		name,
		displayName,
		group: ['transform'],
		version,
		description: '',
		defaults: { name: displayName },
		inputs: [],
		outputs: [],
		properties,
	};
}

/** The AI Agent node, version 3.1, as in `@n8n/nodes-langchain` (Agent V3). */
const aiAgent = description('@n8n/n8n-nodes-langchain.agent', 'AI Agent', 3.1, [
	{
		displayName: 'Source for Prompt (User Message)',
		name: 'promptType',
		type: 'options',
		default: 'auto',
		options: [
			{ name: 'Connected Chat Trigger Node', value: 'auto' },
			{ name: 'Define below', value: 'define' },
		],
	},
	{
		displayName: 'Prompt (User Message)',
		name: 'text',
		type: 'string',
		default: '={{ $json.chatInput }}',
		typeOptions: { rows: 2 },
		displayOptions: { show: { promptType: ['auto'] } },
	},
	{
		displayName: 'Prompt (User Message)',
		name: 'text',
		type: 'string',
		default: '',
		typeOptions: { rows: 2 },
		displayOptions: { show: { promptType: ['define'] } },
	},
	{
		displayName: 'Require Specific Output Format',
		name: 'hasOutputParser',
		type: 'boolean',
		default: false,
	},
	{ displayName: 'Enable Fallback Model', name: 'needsFallback', type: 'boolean', default: false },
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'System Message',
				name: 'systemMessage',
				type: 'string',
				default: 'You are a helpful assistant',
				typeOptions: { rows: 6 },
			},
			{ displayName: 'Max Iterations', name: 'maxIterations', type: 'number', default: 10 },
			{
				displayName: 'Return Intermediate Steps',
				name: 'returnIntermediateSteps',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Automatically Passthrough Binary Images',
				name: 'passthroughBinaryImages',
				type: 'boolean',
				default: true,
			},
			{ displayName: 'Enable Streaming', name: 'enableStreaming', type: 'boolean', default: true },
		],
	},
]);

const httpRequest = description('n8n-nodes-base.httpRequest', 'HTTP Request', 4.2, [
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		default: 'GET',
		options: [
			{ name: 'GET', value: 'GET' },
			{ name: 'POST', value: 'POST' },
			{ name: 'PUT', value: 'PUT' },
		],
	},
	{ displayName: 'URL', name: 'url', type: 'string', default: '' },
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		default: 'none',
		options: [
			{ name: 'None', value: 'none' },
			{ name: 'Predefined Credential Type', value: 'predefinedCredentialType' },
			{ name: 'Generic Credential Type', value: 'genericCredentialType' },
		],
	},
	{ displayName: 'Send Headers', name: 'sendHeaders', type: 'boolean', default: false },
	{
		displayName: 'Header Parameters',
		name: 'headerParameters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		displayOptions: { show: { sendHeaders: [true] } },
		default: {},
		options: [
			{
				name: 'parameters',
				displayName: 'Header',
				values: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
	},
	{ displayName: 'Send Body', name: 'sendBody', type: 'boolean', default: false },
	{
		displayName: 'Body Content Type',
		name: 'contentType',
		type: 'options',
		displayOptions: { show: { sendBody: [true] } },
		default: 'json',
		options: [
			{ name: 'JSON', value: 'json' },
			{ name: 'Form Urlencoded', value: 'form-urlencoded' },
		],
	},
	{
		displayName: 'JSON',
		name: 'jsonBody',
		type: 'json',
		displayOptions: { show: { sendBody: [true], contentType: ['json'] } },
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		options: [
			{ displayName: 'Timeout', name: 'timeout', type: 'number', default: 10000 },
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				default: 'autodetect',
				options: [
					{ name: 'Autodetect', value: 'autodetect' },
					{ name: 'JSON', value: 'json' },
					{ name: 'Text', value: 'text' },
				],
			},
		],
	},
]);

const code = description('n8n-nodes-base.code', 'Code', 2, [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		default: 'runOnceForAllItems',
		options: [
			{ name: 'Run Once for All Items', value: 'runOnceForAllItems' },
			{ name: 'Run Once for Each Item', value: 'runOnceForEachItem' },
		],
	},
	{
		displayName: 'JavaScript',
		name: 'jsCode',
		type: 'string',
		typeOptions: { editor: 'codeNodeEditor', editorLanguage: 'javaScript' },
		default: '',
	},
]);

/** A node in the key order of a saved workflow. */
function node(
	type: INodeTypeDescription,
	id: string,
	parameters: INode['parameters'],
	extra: Partial<INode> = {},
): INode {
	const { name, ...rest } = extra;
	return {
		parameters,
		type: type.name,
		typeVersion: Array.isArray(type.version) ? type.version[0] : type.version,
		position: [420, 300],
		id,
		name: name ?? type.displayName,
		...rest,
	};
}

const SYSTEM_MESSAGE_BEFORE = `You are a support assistant for Acme.

Answer questions about orders and refunds.
Use the order lookup tool to find an order.
Keep answers short and friendly.
Do not share internal notes with the customer.`;

const SYSTEM_MESSAGE_AFTER = `You are a support assistant for Acme.

Answer questions about orders, refunds and shipping.
Use the order lookup tool to find an order.
Use the shipping tool to track a parcel.
Keep answers short and friendly.
Do not share internal notes with the customer.
When you cannot help, hand the ticket over to a human agent.`;

const AGENT_ID = '5f0c1b8e-3a52-4d0e-9a8e-2c7e4b1f9d21';
const HTTP_ID = 'b0e3f6a2-7c41-4e8d-8f2a-91d4c6e5a7b3';
const CODE_ID = 'c7a9d2e4-1b36-4f5a-a0c8-6e2d9f1b4a57';

export const nodePairs = {
	aiAgent: {
		title: 'AI Agent: prompt, system message and options',
		nodeType: aiAgent,
		before: node(
			aiAgent,
			AGENT_ID,
			{
				options: {
					systemMessage: SYSTEM_MESSAGE_BEFORE,
				},
			},
			{ name: 'Support agent' },
		),
		after: node(
			aiAgent,
			AGENT_ID,
			{
				promptType: 'define',
				text: '=Customer: {{ $json.customer.name }}\nMessage: {{ $json.message }}',
				hasOutputParser: true,
				options: {
					systemMessage: SYSTEM_MESSAGE_AFTER,
					maxIterations: 20,
					enableStreaming: false,
				},
			},
			{ name: 'Support agent', retryOnFail: true, maxTries: 2 },
		),
	},
	httpRequest: {
		title: 'HTTP Request: method, body, headers, options and retry',
		nodeType: httpRequest,
		before: node(
			httpRequest,
			HTTP_ID,
			{
				url: 'https://api.example.com/v1/tickets',
				authentication: 'predefinedCredentialType',
				options: { timeout: 5000 },
			},
			{
				name: 'Fetch tickets',
				credentials: { zendeskApi: { id: 'Kq3xPz8LmN2vR7tY', name: 'Zendesk (staging)' } },
			},
		),
		after: node(
			httpRequest,
			HTTP_ID,
			{
				method: 'POST',
				url: '={{ $env.API_URL }}/v2/tickets',
				authentication: 'predefinedCredentialType',
				sendHeaders: true,
				headerParameters: {
					parameters: [
						{ name: 'X-Request-Id', value: '={{ $execution.id }}' },
						{ name: 'Accept', value: 'application/json' },
					],
				},
				sendBody: true,
				jsonBody: '{\n  "status": "open",\n  "limit": 50\n}',
				options: { timeout: 30000, responseFormat: 'json' },
			},
			{
				name: 'Create ticket',
				credentials: { zendeskApi: { id: 'Wm5bHc1DfG9sJ4uE', name: 'Zendesk (production)' } },
				retryOnFail: true,
				maxTries: 5,
				onError: 'continueErrorOutput',
			},
		),
	},
	code: {
		title: 'Code: mode and code change',
		nodeType: code,
		before: node(code, CODE_ID, {
			jsCode:
				'const items = $input.all();\n\nreturn items.map((item) => ({\n  json: { id: item.json.id },\n}));',
		}),
		after: node(code, CODE_ID, {
			mode: 'runOnceForEachItem',
			jsCode:
				"const { id, priority } = $input.item.json;\n\nif (!id) throw new Error('No id');\n\nreturn { json: { id, urgent: priority === 'high' } };",
		}),
	},
	added: {
		title: 'Added AI Agent',
		nodeType: aiAgent,
		after: node(
			aiAgent,
			'e2b4c6d8-0f1a-4b3c-9d5e-7f8a1b2c3d4e',
			{
				options: {
					systemMessage:
						'You sort incoming tickets.\nReply with one word: billing, shipping or other.',
				},
			},
			{ name: 'Ticket classifier' },
		),
	},
} satisfies Record<string, Pair>;
