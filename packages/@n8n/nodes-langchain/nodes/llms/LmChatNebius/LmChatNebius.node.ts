import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	aiClientFetch,
	getConnectionHintNoticeField,
	getProxyAgent,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
} from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import type { OpenAICompatibleCredential } from '../../../types/types';
import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';

/**
 * Token Factory serves chat, embedding, rerank and image models from one /v1/models list.
 * With verbose=true each entry carries architecture.modality (for example "text->text",
 * "text+image->text" or "text2text") and a status. Keep active models whose output
 * modality is text. Entries without a modality are kept so the list never comes back empty.
 */
const MODEL_FILTER =
	"={{ !['validating', 'error', 'deleted'].includes($responseItem.status) && " +
	'(!($responseItem.architecture && $responseItem.architecture.modality) || ' +
	"$responseItem.architecture.modality.split(/->|2/).pop().includes('text')) }}";

/**
 * Shown under each model in the dropdown, built from supported_features
 * (for example "tools, json_mode, reasoning"), so users can spot tool-capable models for agents.
 */
const MODEL_DESCRIPTION =
	"={{ ($responseItem.supported_features || []).length ? 'Supports: ' + $responseItem.supported_features.join(', ') : '' }}";

type NebiusOptions = {
	frequencyPenalty?: number;
	maxTokens?: number;
	maxRetries?: number;
	presencePenalty?: number;
	responseFormat?: 'text' | 'json_object';
	temperature?: number;
	timeout?: number;
	topP?: number;
};

export class LmChatNebius implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nebius Token Factory Chat Model',
		name: 'lmChatNebius',
		icon: 'file:nebius.svg',
		group: ['transform'],
		version: [1],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Nebius Token Factory Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatnebius/',
					},
				],
			},
			alias: [
				'nebius',
				'token factory',
				'open source',
				'kimi',
				'deepseek',
				'qwen',
				'glm',
				'nemotron',
				'gpt-oss',
				'minimax',
				'gemma',
			],
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'nebiusApi',
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
					'If using JSON response format, you must include word "json" in the prompt in your chain or agent. Also, make sure to select a model that supports structured output.',
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
					'The model which will generate the completion. Agents that call tools need a model that supports tools. <a href="https://docs.tokenfactory.nebius.com/ai-models-inference/overview">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/models',
								qs: { verbose: true },
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: { property: 'data' },
									},
									{
										type: 'filter',
										properties: { pass: MODEL_FILTER },
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.id}}',
											value: '={{$responseItem.id}}',
											description: MODEL_DESCRIPTION,
										},
									},
									{
										type: 'sort',
										properties: { key: 'name' },
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
				default: 'deepseek-ai/DeepSeek-V4-Flash-0731',
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
							'The maximum number of tokens to generate in the completion. -1 uses the model maximum.',
						type: 'number',
						typeOptions: { maxValue: 131072 },
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
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<OpenAICompatibleCredential>('nebiusApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const { responseFormat, timeout, maxRetries, ...options } = this.getNodeParameter(
			'options',
			itemIndex,
			{},
		) as NebiusOptions;

		const configuration: ClientOptions = {
			baseURL: credentials.url,
			fetch: aiClientFetch,
			fetchOptions: {
				dispatcher: getProxyAgent(
					credentials.url,
					{
						headersTimeout: timeout,
						bodyTimeout: timeout,
					},
					this.helpers.getSecureEgressFilter(),
				),
			},
		};

		const model = new ChatOpenAI({
			apiKey: credentials.apiKey,
			model: modelName,
			...options,
			timeout,
			maxRetries: maxRetries ?? 2,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs: responseFormat
				? {
						response_format: { type: responseFormat },
					}
				: undefined,
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
		});

		return {
			response: model,
		};
	}
}
