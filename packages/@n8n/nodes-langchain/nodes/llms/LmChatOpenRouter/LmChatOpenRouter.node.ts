import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import type { OpenAICompatibleCredential } from '../../../types/types';
import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

export class LmChatOpenRouter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenRouter Chat Model',
		name: 'lmChatOpenRouter',
		icon: { light: 'file:openrouter.svg', dark: 'file:openrouter.dark.svg' },
		group: ['transform'],
		version: [1],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'OpenRouter Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenrouter/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'openRouterApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials?.url }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName:
					'If using JSON response format, you must include word "json" in the prompt in your chain or agent. Also, make sure to select latest models released post November 2023.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.responseFormat': ['json_object'],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The model which will generate the completion. <a href="https://openrouter.ai/docs/models">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/models',
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
				default: 'openai/gpt-4.1-mini',
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
						displayName: 'Timeout',
						name: 'timeout',
						default: 360000,
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
						displayName: 'Provider Routing',
						name: 'providerRouting',
						type: 'collection',
						default: {},
						description:
							'Configure which sub-providers handle your requests. <a href="https://openrouter.ai/docs/provider-routing">Learn more</a>.',
						placeholder: 'Add Provider Routing Option',
						options: [
							{
								displayName: 'Order',
								name: 'order',
								type: 'string',
								default: '',
								placeholder: 'anthropic,openai,google',
								description:
									'Comma-separated list of provider slugs to try in order. <a href="https://openrouter.ai/docs/provider-routing#provider-sorting">Learn more</a>.',
							},
							{
								displayName: 'Allow Fallbacks',
								name: 'allowFallbacks',
								type: 'boolean',
								default: true,
								description: 'Whether to allow backup providers when the primary is unavailable',
							},
							{
								displayName: 'Require Parameters',
								name: 'requireParameters',
								type: 'boolean',
								default: false,
								description:
									'Whether to only use providers that support all parameters in your request',
							},
							{
								displayName: 'Data Collection',
								name: 'dataCollection',
								type: 'options',
								options: [
									{ name: 'Allow', value: 'allow' },
									{ name: 'Deny', value: 'deny' },
								],
								default: 'allow',
								description:
									'Whether to use providers that may store data. Deny restricts to providers with zero data retention.',
							},
							{
								displayName: 'Zero Data Retention (ZDR)',
								name: 'zdr',
								type: 'boolean',
								default: false,
								description:
									'Whether to restrict routing to only providers with Zero Data Retention endpoints',
							},
							{
								displayName: 'Only',
								name: 'only',
								type: 'string',
								default: '',
								placeholder: 'azure,anthropic',
								description:
									'Comma-separated list of provider slugs to allow for this request. Only these providers will be used. <a href="https://openrouter.ai/docs/guides/routing/provider-selection#allowing-only-specific-providers">Learn more</a>.',
							},
							{
								displayName: 'Ignore',
								name: 'ignore',
								type: 'string',
								default: '',
								placeholder: 'anthropic,openai',
								description: 'Comma-separated list of provider slugs to skip for this request',
							},
							{
								displayName: 'Sort',
								name: 'sort',
								type: 'options',
								options: [
									{ name: 'Price', value: 'price' },
									{ name: 'Throughput', value: 'throughput' },
									{ name: 'Latency', value: 'latency' },
								],
								default: '',
								description:
									'Sort providers by a specific attribute. Disables load balancing and tries providers in order. <a href="https://openrouter.ai/docs/provider-routing#provider-sorting">Learn more</a>.',
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<OpenAICompatibleCredential>('openRouterApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			frequencyPenalty?: number;
			maxTokens?: number;
			maxRetries: number;
			timeout: number;
			presencePenalty?: number;
			temperature?: number;
			topP?: number;
			responseFormat?: 'text' | 'json_object';
			providerRouting?: {
				order?: string;
				allowFallbacks?: boolean;
				requireParameters?: boolean;
				dataCollection?: 'allow' | 'deny';
				zdr?: boolean;
				only?: string;
				ignore?: string;
				sort?: 'price' | 'throughput' | 'latency';
			};
		};

		const timeout = options.timeout;
		const configuration: ClientOptions = {
			baseURL: credentials.url,
			fetchOptions: {
				dispatcher: getProxyAgent(credentials.url, {
					headersTimeout: timeout,
					bodyTimeout: timeout,
				}),
			},
		};

		// Build provider routing object
		const provider: Record<string, unknown> = {};
		if (options.providerRouting) {
			const routing = options.providerRouting;

			if (routing.order) {
				provider.order = routing.order
					.split(',')
					.map((p) => p.trim())
					.filter((p) => p);
			}
			if (routing.allowFallbacks !== undefined) {
				provider.allow_fallbacks = routing.allowFallbacks;
			}
			if (routing.requireParameters !== undefined) {
				provider.require_parameters = routing.requireParameters;
			}
			if (routing.dataCollection) {
				provider.data_collection = routing.dataCollection;
			}
			if (routing.zdr !== undefined) {
				provider.zdr = routing.zdr;
			}
			if (routing.only) {
				provider.only = routing.only
					.split(',')
					.map((p) => p.trim())
					.filter((p) => p);
			}
			if (routing.ignore) {
				provider.ignore = routing.ignore
					.split(',')
					.map((p) => p.trim())
					.filter((p) => p);
			}
			if (routing.sort) {
				provider.sort = routing.sort;
			}
		}

		// Build modelKwargs
		const modelKwargs: Record<string, unknown> = {};
		if (options.responseFormat) {
			modelKwargs.response_format = { type: options.responseFormat };
		}
		if (Object.keys(provider).length > 0) {
			modelKwargs.provider = provider;
		}

		const model = new ChatOpenAI({
			apiKey: credentials.apiKey,
			model: modelName,
			...options,
			timeout,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs: Object.keys(modelKwargs).length > 0 ? modelKwargs : undefined,
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
		});

		return {
			response: model,
		};
	}
}
