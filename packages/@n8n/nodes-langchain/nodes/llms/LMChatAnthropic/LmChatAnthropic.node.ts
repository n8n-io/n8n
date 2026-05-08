import { ChatAnthropic, type ChatAnthropicInput } from '@langchain/anthropic';
import type { LLMResult } from '@langchain/core/outputs';
import {
	getProxyAgent,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getConnectionHintNoticeField,
} from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeProperties,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { searchModels } from './methods/searchModels';

const ANTHROPIC_MODEL_BUILDER_HINT = {
	propertyHint:
		'Default to claude-sonnet-4-6 (latest Sonnet); use claude-opus-4-7 when the user needs the most capable model. Never use Claude Sonnet 4.5, Claude 3.x, Claude 2, or LEGACY options — those are superseded and are not valid choices. When extended thinking is needed on Opus 4.7+, set Thinking Mode to Adaptive and choose an Effort level. The legacy Manual thinking mode is rejected by Opus 4.7.',
};

const modelField: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
	options: [
		{
			name: 'Claude 3.5 Sonnet(20241022)',
			value: 'claude-3-5-sonnet-20241022',
		},
		{
			name: 'Claude 3 Opus(20240229)',
			value: 'claude-3-opus-20240229',
		},
		{
			name: 'Claude 3.5 Sonnet(20240620)',
			value: 'claude-3-5-sonnet-20240620',
		},
		{
			name: 'Claude 3 Sonnet(20240229)',
			value: 'claude-3-sonnet-20240229',
		},
		{
			name: 'Claude 3.5 Haiku(20241022)',
			value: 'claude-3-5-haiku-20241022',
		},
		{
			name: 'Claude 3 Haiku(20240307)',
			value: 'claude-3-haiku-20240307',
		},
		{
			name: 'LEGACY: Claude 2',
			value: 'claude-2',
		},
		{
			name: 'LEGACY: Claude 2.1',
			value: 'claude-2.1',
		},
		{
			name: 'LEGACY: Claude Instant 1.2',
			value: 'claude-instant-1.2',
		},
		{
			name: 'LEGACY: Claude Instant 1',
			value: 'claude-instant-1',
		},
	],
	description:
		'The model which will generate the completion. <a href="https://docs.anthropic.com/claude/docs/models-overview">Learn more</a>.',
	default: 'claude-2',
	builderHint: ANTHROPIC_MODEL_BUILDER_HINT,
};

const MIN_THINKING_BUDGET = 1024;
const DEFAULT_MAX_TOKENS = 4096;
export class LmChatAnthropic implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Anthropic Chat Model',

		name: 'lmChatAnthropic',
		icon: 'file:anthropic.svg',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
		defaultVersion: 1.5,
		description: 'Language Model Anthropic',
		defaults: {
			name: 'Anthropic Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatanthropic/',
					},
				],
			},
			alias: ['claude', 'sonnet', 'opus'],
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'anthropicApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiChain]),
			{
				...modelField,
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				...modelField,
				default: 'claude-3-sonnet-20240229',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			},
			{
				...modelField,
				default: 'claude-3-5-sonnet-20240620',
				options: (modelField.options ?? []).filter(
					(o): o is INodePropertyOptions => 'name' in o && !o.name.toString().startsWith('LEGACY'),
				),
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lte: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: 'claude-sonnet-4-5-20250929',
					cachedResultName: 'Claude Sonnet 4.5',
				},
				builderHint: ANTHROPIC_MODEL_BUILDER_HINT,
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
						placeholder: 'Claude Sonnet',
					},
				],
				description:
					'The model. Choose from the list, or specify an ID. <a href="https://docs.anthropic.com/claude/docs/models-overview">Learn more</a>.',
				displayOptions: {
					show: {
						'@version': [1.3],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: 'claude-sonnet-4-6',
					cachedResultName: 'Claude Sonnet 4.6',
				},
				builderHint: ANTHROPIC_MODEL_BUILDER_HINT,
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
						placeholder: 'Claude Sonnet',
					},
				],
				description:
					'The model. Choose from the list, or specify an ID. <a href="https://docs.anthropic.com/claude/docs/models-overview">Learn more</a>.',
				displayOptions: {
					show: {
						'@version': [1.4],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: 'claude-sonnet-4-6',
					cachedResultName: 'Claude Sonnet 4.6',
				},
				builderHint: ANTHROPIC_MODEL_BUILDER_HINT,
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
						placeholder: 'Claude Sonnet',
					},
				],
				description:
					'The model. Choose from the list, or specify an ID. <a href="https://docs.anthropic.com/claude/docs/models-overview">Learn more</a>.',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.5 } }],
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
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokensToSample',
						default: DEFAULT_MAX_TOKENS,
						description: 'The maximum number of tokens to generate in the completion',
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
						displayOptions: {
							hide: {
								thinking: [true],
								thinkingMode: ['adaptive', 'manual'],
							},
						},
					},
					{
						displayName: 'Top K',
						name: 'topK',
						default: -1,
						typeOptions: { maxValue: 1, minValue: -1, numberPrecision: 1 },
						description:
							'Used to remove "long tail" low probability responses. Defaults to -1, which disables it.',
						type: 'number',
						displayOptions: {
							hide: {
								thinking: [true],
								thinkingMode: ['adaptive', 'manual'],
							},
						},
					},
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
						type: 'number',
						displayOptions: {
							hide: {
								thinking: [true],
								thinkingMode: ['adaptive', 'manual'],
							},
						},
					},
					{
						displayName: 'Enable Thinking',
						name: 'thinking',
						type: 'boolean',
						default: false,
						description: 'Whether to enable thinking mode for the model',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { lte: 1.4 } }],
							},
						},
					},
					{
						displayName: 'Thinking Budget (Tokens)',
						name: 'thinkingBudget',
						type: 'number',
						default: MIN_THINKING_BUDGET,
						description: 'The maximum number of tokens to use for thinking',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { lte: 1.4 } }],
								thinking: [true],
							},
						},
					},
					{
						displayName: 'Thinking Mode',
						name: 'thinkingMode',
						type: 'options',
						default: 'disabled',
						description: 'How extended thinking should be configured for the model',
						options: [
							{
								name: 'Disabled',
								value: 'disabled',
								description: 'No extended thinking',
							},
							{
								name: 'Adaptive (Recommended)',
								value: 'adaptive',
								description: 'Claude decides how much to think; control with Effort',
							},
							{
								name: 'Manual (Deprecated)',
								value: 'manual',
								description: 'Legacy fixed-budget mode; rejected by Opus 4.7+',
							},
						],
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.5 } }],
							},
						},
					},
					{
						displayName: 'Effort',
						name: 'effort',
						type: 'options',
						default: 'medium',
						description: 'Effort level for adaptive thinking',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
							{ name: 'X-High', value: 'xhigh' },
							{ name: 'Max', value: 'max' },
						],
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.5 } }],
								thinkingMode: ['adaptive'],
								'/model.value': [{ _cnd: { includes: 'opus' } }],
							},
						},
					},
					{
						displayName: 'Effort',
						name: 'effort',
						type: 'options',
						default: 'medium',
						description: 'Effort level for adaptive thinking',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
						],
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.5 } }],
								thinkingMode: ['adaptive'],
								'/model.value': [{ _cnd: { regex: '^(?!.*opus).*' } }],
							},
						},
					},
					{
						displayName: 'Thinking Budget (Tokens)',
						name: 'thinkingBudget',
						type: 'number',
						default: MIN_THINKING_BUDGET,
						description: 'Maximum tokens used for thinking. Manual mode is rejected by Opus 4.7+.',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.5 } }],
								thinkingMode: ['manual'],
							},
						},
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<{
			url?: string;
			apiKey?: string;
			header?: boolean;
			headerName?: string;
			headerValue?: string;
		}>('anthropicApi');
		const baseURL = credentials.url ?? 'https://api.anthropic.com';
		const version = this.getNode().typeVersion;
		const modelName =
			version >= 1.3
				? (this.getNodeParameter('model.value', itemIndex) as string)
				: (this.getNodeParameter('model', itemIndex) as string);

		if (!modelName) {
			throw new NodeOperationError(this.getNode(), 'No model selected. Please choose a model.', {
				itemIndex,
			});
		}

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxTokensToSample?: number;
			temperature?: number;
			topK?: number;
			topP?: number;
			thinking?: boolean;
			thinkingBudget?: number;
			thinkingMode?: 'disabled' | 'adaptive' | 'manual';
			effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
		};

		const isOpus47Model = modelName.startsWith('claude-opus-4-7');
		const thinkingMode: 'disabled' | 'adaptive' | 'manual' =
			version >= 1.5
				? (options.thinkingMode ?? 'disabled')
				: options.thinking
					? 'manual'
					: 'disabled';

		if (thinkingMode === 'manual' && isOpus47Model) {
			throw new NodeOperationError(
				this.getNode(),
				`Manual thinking mode is not supported on "${modelName}". Use Thinking Mode = Adaptive (with Effort) instead.`,
				{ itemIndex },
			);
		}

		let invocationKwargs: Record<string, unknown> = {};
		if (thinkingMode === 'adaptive') {
			invocationKwargs = {
				thinking: { type: 'adaptive' },
				output_config: { effort: options.effort ?? 'medium' },
				max_tokens: options.maxTokensToSample ?? DEFAULT_MAX_TOKENS,
				top_k: undefined,
				top_p: undefined,
				temperature: undefined,
			};
		} else if (thinkingMode === 'manual') {
			invocationKwargs = {
				thinking: {
					type: 'enabled',
					// If thinking is enabled, we need to set a budget.
					// We fallback to 1024 as that is the minimum
					budget_tokens: options.thinkingBudget ?? MIN_THINKING_BUDGET,
				},
				// The default Langchain max_tokens is -1 (no limit) but Anthropic requires a number
				// higher than budget_tokens
				max_tokens: options.maxTokensToSample ?? DEFAULT_MAX_TOKENS,
				// These need to be unset when thinking is enabled.
				// Because the invocationKwargs will override the model options
				// we can pass options to the model and then override them here
				top_k: undefined,
				top_p: undefined,
				temperature: undefined,
			};
		}

		const tokensUsageParser = (result: LLMResult) => {
			const usage = (result?.llmOutput?.usage as {
				input_tokens: number;
				output_tokens: number;
			}) ?? {
				input_tokens: 0,
				output_tokens: 0,
			};
			return {
				completionTokens: usage.output_tokens,
				promptTokens: usage.input_tokens,
				totalTokens: usage.input_tokens + usage.output_tokens,
			};
		};

		const clientOptions: {
			fetchOptions?: { dispatcher: ReturnType<typeof getProxyAgent> };
			defaultHeaders?: Record<string, string>;
		} = {
			fetchOptions: {
				dispatcher: getProxyAgent(baseURL),
			},
		};

		if (
			credentials.header &&
			typeof credentials.headerName === 'string' &&
			credentials.headerName &&
			typeof credentials.headerValue === 'string'
		) {
			clientOptions.defaultHeaders = {
				[credentials.headerName]: credentials.headerValue,
			};
		}

		const isUsingGateway = baseURL !== 'https://api.anthropic.com';
		const gatewayErrorHandler = isUsingGateway
			? (error: unknown) => {
					const message = error instanceof Error ? error.message : String(error);
					const isModelError =
						/model.*not found|not found.*model|invalid model|does not exist/i.test(message);
					if (isModelError) {
						throw new NodeOperationError(
							this.getNode(),
							`The model "${modelName}" was not found at ${baseURL}. If you're using an AI gateway, select a model that your gateway supports.`,
							{ itemIndex },
						);
					}
				}
			: undefined;

		const chatAnthropicParams: ChatAnthropicInput = {
			anthropicApiKey: credentials.apiKey,
			model: modelName,
			anthropicApiUrl: baseURL,
			maxTokens: options.maxTokensToSample,
			callbacks: [new N8nLlmTracing(this, { tokensUsageParser })],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, gatewayErrorHandler),
			invocationKwargs,
			clientOptions,
		};

		// Opus 4.7 rejects temperature/topK/topP at the SDK layer regardless of thinking mode
		if (!isOpus47Model) {
			chatAnthropicParams.temperature = options.temperature;
			chatAnthropicParams.topK = options.topK;
			chatAnthropicParams.topP = options.topP;
		}

		const model = new ChatAnthropic(chatAnthropicParams);

		// Some Anthropic models do not support Langchain default of -1 for topP so we need to unset it
		if (options.topP === undefined) {
			delete model.topP;
		}

		// If topP is set to a value and temperature is not, unset default Langchain temperature
		if (options.topP !== undefined && options.temperature === undefined) {
			delete model.temperature;
		}

		return {
			response: model,
		};
	}
}
