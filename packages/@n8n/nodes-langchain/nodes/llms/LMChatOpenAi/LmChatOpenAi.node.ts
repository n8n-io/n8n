import { ChatOpenAI, type ChatOpenAIFields, type ClientOptions } from '@langchain/openai';
import pick from 'lodash/pick';
import {
	NodeConnectionTypes,
	type INodeProperties,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { formatBuiltInTools, prepareAdditionalResponsesParams } from './common';
import { searchModels } from './methods/loadModels';
import type { ModelOptions } from './types';
import { Container } from '@n8n/di';
import { AiConfig } from '@n8n/config';

const INCLUDE_JSON_WARNING: INodeProperties = {
	displayName:
		'If using JSON response format, you must include word "json" in the prompt in your chain or agent. Also, make sure to select latest models released post November 2023.',
	name: 'notice',
	type: 'notice',
	default: '',
};

const completionsResponseFormat: INodeProperties = {
	displayName: 'Response Format',
	name: 'responseFormat',
	default: 'text',
	type: 'options',
	options: [
		{
			name: 'Text',
			value: 'text',
			description: 'Regular text response',
		},
		{
			name: 'JSON',
			value: 'json_object',
			description:
				'Enables JSON mode, which should guarantee the message the model generates is valid JSON',
		},
	],
};

const jsonSchemaExample = `{
  "type": "object",
  "properties": {
    "message": {
      "type": "string"
    }
  },
  "additionalProperties": false,
  "required": ["message"]
}`;

export class LmChatOpenAi implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'OpenAI Chat Model',

		name: 'lmChatOpenAi',
		icon: { light: 'file:openAiLight.svg', dark: 'file:openAiLight.dark.svg' },
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'OpenAI Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL:
				'={{ $parameter.options?.baseURL?.split("/").slice(0,-1).join("/") || $credentials?.url?.split("/").slice(0,-1).join("/") || "https://api.openai.com" }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				...INCLUDE_JSON_WARNING,
				displayOptions: {
					show: {
						'/options.responseFormat': ['json_object'],
					},
				},
			},
			{
				...INCLUDE_JSON_WARNING,
				displayOptions: {
					show: {
						'/options.textFormat.textOptions.type': ['json_object'],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The model which will generate the completion. <a href="https://beta.openai.com/docs/models/overview">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '={{ $parameter.options?.baseURL?.split("/").slice(-1).pop() || $credentials?.url?.split("/").slice(-1).pop() || "v1" }}/models',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'data',
										},
									},
									{
										type: 'filter',
										properties: {
											// If the baseURL is not set or is set to api.openai.com, include only chat models
											pass: `={{
												($parameter.options?.baseURL && !$parameter.options?.baseURL?.startsWith('https://api.openai.com/')) ||
												($credentials?.url && !$credentials.url.startsWith('https://api.openai.com/')) ||
												$responseItem.id.startsWith('ft:') ||
												$responseItem.id.startsWith('o1') ||
												$responseItem.id.startsWith('o3') ||
												($responseItem.id.startsWith('gpt-') && !$responseItem.id.includes('instruct'))
											}}`,
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.id}}',
											value: '={{$responseItem.id}}',
										},
									},
									{
										type: 'sort',
										properties: {
											key: 'name',
										},
									},
								],
							},
						},
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'model',
					},
				},
				default: 'gpt-5-mini',
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: 'gpt-5-mini' },
				required: true,
				modes: [
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
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'gpt-5-mini',
					},
				],
				description: 'The model. Choose from the list, or specify an ID.',
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { lte: 1.1 } }],
					},
				},
			},
			{
				displayName:
					'When using non-OpenAI models via "Base URL" override, not all models might be chat-compatible or support other features, like tools calling or JSON response format',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.baseURL': [{ _cnd: { exists: true } }],
					},
				},
			},
			{
				displayName: 'Use Responses API',
				name: 'responsesApiEnabled',
				type: 'boolean',
				default: true,
				description:
					'Whether to use the Responses API to generate the response. <a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/#use-responses-api">Learn more</a>.',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.3 } }],
					},
				},
			},
			{
				displayName: 'Built-in Tools',
				name: 'builtInTools',
				placeholder: 'Add Built-in Tool',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Web Search',
						name: 'webSearch',
						type: 'collection',
						default: { searchContextSize: 'medium' },
						options: [
							{
								displayName: 'Search Context Size',
								name: 'searchContextSize',
								type: 'options',
								default: 'medium',
								description:
									'High level guidance for the amount of context window space to use for the search',
								options: [
									{ name: 'Low', value: 'low' },
									{ name: 'Medium', value: 'medium' },
									{ name: 'High', value: 'high' },
								],
							},
							{
								displayName: 'Web Search Allowed Domains',
								name: 'allowedDomains',
								type: 'string',
								default: '',
								description:
									'Comma-separated list of domains to search. Only domains in this list will be searched.',
								placeholder: 'e.g. google.com, wikipedia.org',
							},
							{
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
								placeholder: 'e.g. US, GB',
							},
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
								placeholder: 'e.g. New York, London',
							},
							{
								displayName: 'Region',
								name: 'region',
								type: 'string',
								default: '',
								placeholder: 'e.g. New York, London',
							},
						],
					},
					{
						displayName: 'File Search',
						name: 'fileSearch',
						type: 'collection',
						default: { vectorStoreIds: '[]' },
						options: [
							{
								displayName: 'Vector Store IDs',
								name: 'vectorStoreIds',
								description:
									'The vector store IDs to use for the file search. Vector stores are managed via OpenAI Dashboard. <a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/#built-in-tools">Learn more</a>.',
								type: 'json',
								default: '[]',
								required: true,
							},
							{
								displayName: 'Filters',
								name: 'filters',
								type: 'json',
								default: '{}',
							},
							{
								displayName: 'Max Results',
								name: 'maxResults',
								type: 'number',
								default: 1,
								typeOptions: { minValue: 1, maxValue: 50 },
							},
						],
					},
					{
						displayName: 'Code Interpreter',
						name: 'codeInterpreter',
						type: 'boolean',
						default: true,
						description: 'Whether to allow the model to execute code in a sandboxed environment',
					},
				],
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.3 } }],
						'/responsesApiEnabled': [true],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Base URL',
						name: 'baseURL',
						default: 'https://api.openai.com/v1',
						description: 'Override the default base URL for the API',
						type: 'string',
						displayOptions: {
							hide: {
								'@version': [{ _cnd: { gte: 1.1 } }],
							},
						},
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
						type: 'number',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: -1,
						description:
							'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768).',
						type: 'number',
						typeOptions: {
							maxValue: 32768,
						},
					},
					{
						...completionsResponseFormat,
						displayOptions: {
							show: {
								'@version': [{ _cnd: { lt: 1.3 } }],
							},
						},
					},
					{
						...completionsResponseFormat,
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
								'/responsesApiEnabled': [false],
							},
						},
					},
					{
						displayName: 'Response Format',
						name: 'textFormat',
						type: 'fixedCollection',
						default: { textOptions: [{ type: 'text' }] },
						options: [
							{
								displayName: 'Text',
								name: 'textOptions',
								values: [
									{
										displayName: 'Type',
										name: 'type',
										type: 'options',
										default: '',
										options: [
											{ name: 'Text', value: 'text' },
											// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
											{ name: 'JSON Schema (recommended)', value: 'json_schema' },
											{ name: 'JSON Object', value: 'json_object' },
										],
									},
									{
										displayName: 'Verbosity',
										name: 'verbosity',
										type: 'options',
										default: 'medium',
										options: [
											{ name: 'Low', value: 'low' },
											{ name: 'Medium', value: 'medium' },
											{ name: 'High', value: 'high' },
										],
									},
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: 'my_schema',
										description:
											'The name of the response format. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.',
										displayOptions: {
											show: {
												type: ['json_schema'],
											},
										},
									},
									{
										displayName:
											'All properties in the schema must be set to "required", when using "strict" mode.',
										name: 'requiredNotice',
										type: 'notice',
										default: '',
										displayOptions: {
											show: {
												strict: [true],
											},
										},
									},
									{
										displayName: 'Schema',
										name: 'schema',
										type: 'json',
										default: jsonSchemaExample,
										description: 'The schema of the response format',
										displayOptions: {
											show: {
												type: ['json_schema'],
											},
										},
									},
									{
										displayName: 'Description',
										name: 'description',
										type: 'string',
										default: '',
										description: 'The description of the response format',
										displayOptions: {
											show: {
												type: ['json_schema'],
											},
										},
									},
									{
										displayName: 'Strict',
										name: 'strict',
										type: 'boolean',
										default: false,
										description:
											'Whether to require that the AI will always generate responses that match the provided JSON Schema',
										displayOptions: {
											show: {
												type: ['json_schema'],
											},
										},
									},
								],
							},
						],
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
								'/responsesApiEnabled': [true],
							},
						},
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
					{
						displayName: 'Reasoning Effort',
						name: 'reasoningEffort',
						default: 'medium',
						description:
							'Controls the amount of reasoning tokens to use. A value of "low" will favor speed and economical token usage, "high" will favor more complete reasoning at the cost of more tokens generated and slower responses.',
						type: 'options',
						options: [
							{
								name: 'Low',
								value: 'low',
								description: 'Favors speed and economical token usage',
							},
							{
								name: 'Medium',
								value: 'medium',
								description: 'Balance between speed and reasoning accuracy',
							},
							{
								name: 'High',
								value: 'high',
								description:
									'Favors more complete reasoning at the cost of more tokens generated and slower responses',
							},
						],
						displayOptions: {
							show: {
								// reasoning_effort is only available on o1, o1-versioned, or on o3-mini and beyond, and gpt-5 models. Not on o1-mini or other GPT-models.
								'/model': [{ _cnd: { regex: '(^o1([-\\d]+)?$)|(^o[3-9].*)|(^gpt-5.*)' } }],
							},
						},
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 60000,
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt',
						type: 'number',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
						type: 'number',
					},
					{
						displayName: 'Conversation ID',
						name: 'conversationId',
						default: '',
						description:
							'The conversation that this response belongs to. Input items and output items from this response are automatically added to this conversation after this response completes.',
						type: 'string',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
								'/responsesApiEnabled': [true],
							},
						},
					},
					{
						displayName: 'Prompt Cache Key',
						name: 'promptCacheKey',
						type: 'string',
						default: '',
						description:
							'Used by OpenAI to cache responses for similar requests to optimize your cache hit rates',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
								'/responsesApiEnabled': [true],
							},
						},
					},
					{
						displayName: 'Safety Identifier',
						name: 'safetyIdentifier',
						type: 'string',
						default: '',
						description:
							"A stable identifier used to help detect users of your application that may be violating OpenAI's usage policies. The IDs should be a string that uniquely identifies each user.",
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
								'/responsesApiEnabled': [true],
							},
						},
					},
					{
						displayName: 'Service Tier',
						name: 'serviceTier',
						type: 'options',
						default: 'auto',
						description: 'The service tier to use for the request',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: 'Flex', value: 'flex' },
							{ name: 'Default', value: 'default' },
							{ name: 'Priority', value: 'priority' },
						],
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
								'/responsesApiEnabled': [true],
							},
						},
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'json',
						description:
							'Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard. Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.',
						default: '{}',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
								'/responsesApiEnabled': [true],
							},
						},
					},
					{
						displayName: 'Top Logprobs',
						name: 'topLogprobs',
						type: 'number',
						default: 0,
						description:
							'An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability',
						typeOptions: {
							minValue: 0,
							maxValue: 20,
						},
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
								'/responsesApiEnabled': [true],
							},
						},
					},
					{
						displayName: 'Prompt',
						name: 'promptConfig',
						type: 'fixedCollection',
						description:
							'Configure the reusable prompt template configured via OpenAI Dashboard. <a href="https://platform.openai.com/docs/guides/prompt-engineering#reusable-prompts">Learn more</a>.',
						default: { promptOptions: [{ promptId: '' }] },
						options: [
							{
								displayName: 'Prompt',
								name: 'promptOptions',
								values: [
									{
										displayName: 'Prompt ID',
										name: 'promptId',
										type: 'string',
										default: '',
										description: 'The unique identifier of the prompt template to use',
									},
									{
										displayName: 'Version',
										name: 'version',
										type: 'string',
										default: '',
										description: 'Optional version of the prompt template',
									},
									{
										displayName: 'Variables',
										name: 'variables',
										type: 'json',
										default: '{}',
										description: 'Variables to be substituted into the prompt template',
									},
								],
							},
						],
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.3 } }],
								'/responsesApiEnabled': [true],
							},
						},
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('openAiApi');

		const version = this.getNode().typeVersion;
		const modelName =
			version >= 1.2
				? (this.getNodeParameter('model.value', itemIndex) as string)
				: (this.getNodeParameter('model', itemIndex) as string);

		const responsesApiEnabled = this.getNodeParameter('responsesApiEnabled', itemIndex, false);

		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;

		const { openAiDefaultHeaders: defaultHeaders } = Container.get(AiConfig);

		const configuration: ClientOptions = {
			defaultHeaders,
		};

		if (options.baseURL) {
			configuration.baseURL = options.baseURL;
		} else if (credentials.url) {
			configuration.baseURL = credentials.url as string;
		}

		const timeout = options.timeout;
		configuration.fetchOptions = {
			dispatcher: getProxyAgent(configuration.baseURL ?? 'https://api.openai.com/v1', {
				headersTimeout: timeout,
				bodyTimeout: timeout,
			}),
		};
		if (
			credentials.header &&
			typeof credentials.headerName === 'string' &&
			credentials.headerName &&
			typeof credentials.headerValue === 'string'
		) {
			configuration.defaultHeaders = {
				...configuration.defaultHeaders,
				[credentials.headerName]: credentials.headerValue,
			};
		}

		// Extra options to send to OpenAI, that are not directly supported by LangChain
		const modelKwargs: Record<string, unknown> = {};
		if (responsesApiEnabled) {
			const kwargs = prepareAdditionalResponsesParams(options);
			Object.assign(modelKwargs, kwargs);
		} else {
			if (options.responseFormat) modelKwargs.response_format = { type: options.responseFormat };
			if (options.reasoningEffort && ['low', 'medium', 'high'].includes(options.reasoningEffort)) {
				modelKwargs.reasoning_effort = options.reasoningEffort;
			}
		}

		const includedOptions = pick(options, [
			'frequencyPenalty',
			'maxTokens',
			'presencePenalty',
			'temperature',
			'topP',
			'baseURL',
		]);

		const fields: ChatOpenAIFields = {
			apiKey: credentials.apiKey as string,
			model: modelName,
			...includedOptions,
			timeout,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs,
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
			// Set to false to ensure compatibility with OpenAI-compatible backends (LM Studio, vLLM, etc.)
			// that reject strict: null in tool definitions
			supportsStrictToolCalling: false,
		};

		// by default ChatOpenAI can switch to responses API automatically, so force it only on 1.3 and above to keep backwards compatibility
		if (responsesApiEnabled) {
			fields.useResponsesApi = true;
		}

		const model = new ChatOpenAI(fields);

		if (responsesApiEnabled) {
			const tools = formatBuiltInTools(
				this.getNodeParameter('builtInTools', itemIndex, {}) as IDataObject,
			);
			// pass tools to the model metadata, ToolAgent will use it to create agent configuration
			if (tools.length) {
				model.metadata = {
					...model.metadata,
					tools,
				};
			}
		}

		return {
			response: model,
		};
	}
}
