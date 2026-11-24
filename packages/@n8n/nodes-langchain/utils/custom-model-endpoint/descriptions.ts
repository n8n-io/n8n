import type { INodeProperties } from 'n8n-workflow';

export const SEARCH_ALIASES = [
	'OpenAI compatible',
	'gateway',
	'proxy',
	'LiteLLM',
	'Portkey',
	'Kong',
	'vLLM',
	'NIM',
	'APIM',
];

export const CHAT_COMPLETIONS_FORMAT = 'chatCompletions';
export const RESPONSES_FORMAT = 'responses';

const onlyChatCompletions = { show: { '/apiFormat': [CHAT_COMPLETIONS_FORMAT] } };
const onlyResponses = { show: { '/apiFormat': [RESPONSES_FORMAT] } };

export const apiFormatField: INodeProperties = {
	displayName: 'API Format',
	name: 'apiFormat',
	type: 'options',
	// Other fields are shown and hidden on this, and displayOptions cannot resolve an expression
	noDataExpression: true,
	options: [
		{ name: 'Chat Completions', value: CHAT_COMPLETIONS_FORMAT },
		{ name: 'Responses', value: RESPONSES_FORMAT },
	],
	default: CHAT_COMPLETIONS_FORMAT,
	description: 'Which API of your gateway to call',
};

export const responsesFormatNotice: INodeProperties = {
	displayName:
		'Check that your gateway serves /responses. The OpenAI built-in tools are not available here, and a tool definition in Extra Body uses the flat Responses shape.',
	name: 'notice',
	type: 'notice',
	default: '',
	displayOptions: { show: { apiFormat: [RESPONSES_FORMAT] } },
};

/** By ID is the default: a gateway does not have to answer `GET /models`. */
export const modelField: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'resourceLocator',
	default: { mode: 'id', value: '' },
	required: true,
	description: 'The model to send the prompt to, as your gateway names it',
	modes: [
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. gpt-4o',
		},
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a model...',
			typeOptions: {
				searchListMethod: 'searchModels',
				searchable: true,
			},
		},
	],
};

export const requestHeaderFields: INodeProperties[] = [
	{
		displayName: 'Headers',
		name: 'headers',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Header',
		default: {},
		description: 'Headers for this request only. Values accept expressions.',
		options: [
			{
				displayName: 'Header',
				name: 'header',
				values: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
	},
	{
		displayName: 'Extra Body',
		name: 'extraBody',
		type: 'json',
		default: '',
		placeholder: '{ "tools": [] }',
		description:
			'JSON merged into the request body, for fields your gateway or provider accepts that this node has no field for',
	},
	{
		displayName: 'Send n8n Context Headers',
		name: 'sendContextHeaders',
		type: 'boolean',
		default: true,
		description:
			'Whether to send x-n8n-workflow-id, x-n8n-workflow-name and x-n8n-execution-id, so a gateway can attribute usage',
	},
];

const sharedOptions: INodeProperties[] = [
	{
		displayName: 'Frequency Penalty',
		name: 'frequencyPenalty',
		type: 'number',
		default: 0,
		typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
		displayOptions: onlyChatCompletions,
		description:
			"Positive values penalise tokens by how often they have appeared, lowering the model's tendency to repeat a line",
	},
	{
		displayName: 'Maximum Number of Tokens',
		name: 'maxTokens',
		type: 'number',
		default: -1,
		displayOptions: onlyChatCompletions,
		description:
			'The cap on the tokens generated. Sent as max_completion_tokens for a reasoning model and as max_tokens otherwise. Use Extra Body to force a different field.',
	},
	{
		displayName: 'Max Output Tokens',
		name: 'maxOutputTokens',
		type: 'number',
		default: -1,
		displayOptions: onlyResponses,
		description: 'The cap on the tokens generated, sent as max_output_tokens',
	},
	{
		displayName: 'Max Retries',
		name: 'maxRetries',
		type: 'number',
		default: 2,
		description: 'How many times to retry a timeout, a rate limit or a gateway failure',
	},
	{
		displayName: 'Presence Penalty',
		name: 'presencePenalty',
		type: 'number',
		default: 0,
		typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
		displayOptions: onlyChatCompletions,
		description:
			"Positive values penalise tokens that have appeared at all, raising the model's tendency to change subject",
	},
	{
		displayName: 'Reasoning Summary',
		name: 'reasoningSummary',
		type: 'options',
		default: 'auto',
		displayOptions: onlyResponses,
		options: [
			{ name: 'Auto', value: 'auto' },
			{ name: 'Concise', value: 'concise' },
			{ name: 'Detailed', value: 'detailed' },
		],
		description:
			'Ask a reasoning model to summarise its reasoning. Not every model or gateway serves one.',
	},
	{
		displayName: 'Sampling Temperature',
		name: 'temperature',
		type: 'number',
		default: 0.7,
		typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
		description: 'Lower values make the answer more deterministic and repetitive',
	},
	{
		displayName: 'Seed',
		name: 'seed',
		type: 'number',
		default: 0,
		displayOptions: onlyChatCompletions,
		description: 'Ask the provider to sample deterministically. Not every provider honours it.',
	},
	{
		displayName: 'Stop Sequences',
		name: 'stop',
		type: 'string',
		default: '',
		placeholder: 'e.g. END,STOP',
		displayOptions: onlyChatCompletions,
		description: 'Comma-separated strings that end the answer when the model produces one',
	},
	{
		displayName: 'Store Response',
		name: 'storeResponse',
		type: 'boolean',
		default: false,
		displayOptions: onlyResponses,
		description: 'Whether the gateway may keep the response, so a later call can refer to it',
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'number',
		default: 360000,
		description: 'How long one request may take, in milliseconds',
	},
	{
		displayName: 'Top P',
		name: 'topP',
		type: 'number',
		default: 1,
		typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
		description:
			'Nucleus sampling: 0.5 considers half of the likelihood-weighted options. Change this or the temperature, not both.',
	},
	{
		displayName: 'Truncation',
		name: 'truncation',
		type: 'options',
		default: 'auto',
		displayOptions: onlyResponses,
		options: [
			{ name: 'Auto', value: 'auto' },
			{ name: 'Disabled', value: 'disabled' },
		],
		description:
			'What to do when the conversation outgrows the context window. Auto drops items from the middle, Disabled fails the request.',
	},
];

export const chatModelOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	description: 'Additional options to add',
	default: {},
	options: sharedOptions,
};
