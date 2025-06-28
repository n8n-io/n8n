/* eslint-disable n8n-nodes-base/node-dirname-against-convention */

import { ChatAnthropic } from '@langchain/anthropic';
import type { LLMResult } from '@langchain/core/outputs';
import {
	NodeConnectionTypes,
	type INodePropertyOptions,
	type INodeProperties,
	type ISupplyDataFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { getHttpProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { searchModels } from './methods/searchModels';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmChatAnthropic',
		icon: 'file:anthropic.svg',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		defaultVersion: 1.3,
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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
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
					value: 'claude-sonnet-4-20250514',
					cachedResultName: 'Claude 4 Sonnet',
				},
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
						'@version': [{ _cnd: { gte: 1.3 } }],
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
							},
						},
					},
					{
						displayName: 'Enable Thinking',
						name: 'thinking',
						type: 'boolean',
						default: false,
						description: 'Whether to enable thinking mode for the model',
					},
					{
						displayName: 'Thinking Budget (Tokens)',
						name: 'thinkingBudget',
						type: 'number',
						default: MIN_THINKING_BUDGET,
						description: 'The maximum number of tokens to use for thinking',
						displayOptions: {
							show: {
								thinking: [true],
							},
						},
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<{ url?: string; apiKey?: string }>(
			'anthropicApi',
		);
		const baseURL = credentials.url ?? 'https://api.anthropic.com';
		const version = this.getNode().typeVersion;
		const modelName =
			version >= 1.3
				? (this.getNodeParameter('model.value', itemIndex) as string)
				: (this.getNodeParameter('model', itemIndex) as string);

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxTokensToSample?: number;
			temperature: number;
			topK?: number;
			topP?: number;
			thinking?: boolean;
			thinkingBudget?: number;
		};
		let invocationKwargs = {};

		const tokensUsageParser = (llmOutput: LLMResult['llmOutput']) => {
			const usage = (llmOutput?.usage as { input_tokens: number; output_tokens: number }) ?? {
				input_tokens: 0,
				output_tokens: 0,
			};
			return {
				completionTokens: usage.output_tokens,
				promptTokens: usage.input_tokens,
				totalTokens: usage.input_tokens + usage.output_tokens,
			};
		};

		if (options.thinking) {
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

		const model = new ChatAnthropic({
			anthropicApiKey: credentials.apiKey,
			model: modelName,
			anthropicApiUrl: baseURL,
			maxTokens: options.maxTokensToSample,
			temperature: options.temperature,
			topK: options.topK,
			topP: options.topP,
			callbacks: [new N8nLlmTracing(this, { tokensUsageParser })],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
			invocationKwargs,
			clientOptions: {
				httpAgent: getHttpProxyAgent(),
			},
		});

		return {
			response: model,
		};
	}
}
