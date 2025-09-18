import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
} from 'n8n-workflow';

import { getProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import type { OpenAICompatibleCredential } from '../../../types/types';
import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

export class LmChatOpenRouter implements INodeType {
	methods = {
		listSearch: {
			async getModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials<OpenAICompatibleCredential>('openRouterApi');

				const response = (await this.helpers.httpRequest({
					method: 'GET',
					url: `${credentials.url}/models`,
					headers: {
						Authorization: `Bearer ${credentials.apiKey}`,
					},
				})) as { data: Array<{ id: string }> };

				const filteredModels = (response.data || []).filter((model: { id: string }) => {
					if (!filter) return true;
					return model.id.toLowerCase().includes(filter.toLowerCase());
				});

				// Sort models alphabetically for better user experience
				filteredModels.sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));

				return {
					results: filteredModels.map((model: { id: string }) => ({
						name: model.id,
						value: model.id,
					})),
				};
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'OpenRouter Chat Model',
		name: 'lmChatOpenRouter',
		icon: { light: 'file:openrouter.svg', dark: 'file:openrouter.dark.svg' },
		group: ['transform'],
		version: [1, 1.1],
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
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
			},
			// Newer resourceLocator model selector (shown for >=1.1)
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: 'openai/gpt-4.1-mini' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a model...',
						typeOptions: {
							searchListMethod: 'getModels',
							searchable: true,
						},
					},
					{
						displayName: 'Custom Model ID',
						name: 'id',
						type: 'string',
						placeholder: '@preset/gpt-oss-120b-cerebras',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '(.+)',
									errorMessage: 'Model ID cannot be empty',
								},
							},
						],
					},
				],
				description:
					'The model. Choose from the list, or specify a custom model ID including @preset/ models.',
				routing: {
					send: {
						type: 'body',
						property: 'model',
					},
				},
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { lte: 1.0 } }],
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
						hint: 'Enter custom model IDs like @preset/ models or any OpenRouter model',
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
						displayName: 'Reasoning Effort Level',
						name: 'reasoningEffort',
						default: 'low',
						type: 'options',
						description:
							'Controls the amount of reasoning effort the model should use. Higher effort may improve reasoning but increase response time and cost.',
						options: [
							{
								name: 'Minimal',
								value: 'minimal',
								description:
									'Minimal reasoning effort for much faster responses (only available on GPT-5)',
							},
							{
								name: 'Low',
								value: 'low',
								description: 'Low reasoning effort for faster responses',
							},
							{
								name: 'Medium',
								value: 'medium',
								description: 'Balanced reasoning effort',
							},
							{
								name: 'High',
								value: 'high',
								description: 'Maximum reasoning effort for complex tasks',
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<OpenAICompatibleCredential>('openRouterApi');

		const version = this.getNode().typeVersion;

		// Determine modelName based on node version only; rest of the flow is compatible
		const modelName =
			version >= 1.1
				? (this.getNodeParameter('model.value', itemIndex) as string) ||
					(this.getNodeParameter('model', itemIndex) as string)
				: (this.getNodeParameter('model', itemIndex) as string);

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			frequencyPenalty?: number;
			maxTokens?: number;
			maxRetries: number;
			timeout: number;
			presencePenalty?: number;
			temperature?: number;
			topP?: number;
			responseFormat?: 'text' | 'json_object';
			reasoningEffort?: 'low' | 'medium' | 'high' | 'minimal';
		};

		const configuration: ClientOptions = {
			baseURL: credentials.url,
			fetchOptions: {
				dispatcher: getProxyAgent(credentials.url),
			},
			defaultHeaders: {
				'HTTP-Referer': 'https://n8n.io',
				'X-Title': 'n8n',
			},
		};

		// Extra options to send to OpenRouter, that are not directly supported by LangChain
		const modelKwargs: {
			response_format?: object;
			reasoning_effort?: 'low' | 'medium' | 'high' | 'minimal';
		} = {};

		// Add response format if specified
		if (options.responseFormat) {
			modelKwargs.response_format = { type: options.responseFormat };
		}

		// Add reasoning effort if specified and valid
		if (
			options.reasoningEffort &&
			['low', 'medium', 'high', 'minimal'].includes(options.reasoningEffort)
		) {
			modelKwargs.reasoning_effort = options.reasoningEffort;
		}

		const model = new ChatOpenAI({
			apiKey: credentials.apiKey,
			model: modelName,
			...options,
			timeout: options.timeout ?? 60000,
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
