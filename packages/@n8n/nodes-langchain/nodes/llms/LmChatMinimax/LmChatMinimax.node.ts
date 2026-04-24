import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	getProxyAgent,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getConnectionHintNoticeField,
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

export class LmChatMinimax implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MiniMax Chat Model',

		name: 'lmChatMinimax',
		icon: 'file:minimax.svg',
		group: ['transform'],
		version: [1],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'MiniMax Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatminimax/',
					},
				],
			},
			alias: ['minimax'],
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'minimaxApi',
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
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The model which will generate the completion. <a href="https://platform.minimax.io/docs/api-reference/text-openai-api">Learn more</a>.',
				options: [
					{ name: 'MiniMax-M2', value: 'MiniMax-M2' },
					{ name: 'MiniMax-M2.1', value: 'MiniMax-M2.1' },
					{ name: 'MiniMax-M2.1-Highspeed', value: 'MiniMax-M2.1-highspeed' },
					{ name: 'MiniMax-M2.5', value: 'MiniMax-M2.5' },
					{ name: 'MiniMax-M2.5-Highspeed', value: 'MiniMax-M2.5-highspeed' },
					{ name: 'MiniMax-M2.7', value: 'MiniMax-M2.7' },
					{ name: 'MiniMax-M2.7-Highspeed', value: 'MiniMax-M2.7-highspeed' },
				],
				default: 'MiniMax-M2.7',
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
						displayName: 'Hide Thinking',
						name: 'hideThinking',
						default: true,
						type: 'boolean',
						description:
							'Whether to strip chain-of-thought reasoning from the response, returning only the final answer',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: -1,
						description:
							'The maximum number of tokens to generate in the completion. The limit depends on the selected model.',
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
		const credentials = await this.getCredentials<OpenAICompatibleCredential>('minimaxApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			hideThinking?: boolean;
			maxTokens?: number;
			maxRetries: number;
			timeout: number;
			temperature?: number;
			topP?: number;
		};

		const hideThinking = options.hideThinking ?? true;

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

		const model = new ChatOpenAI({
			apiKey: credentials.apiKey,
			model: modelName,
			...options,
			timeout,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs: hideThinking ? { reasoning_split: true } : undefined,
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
		});

		return {
			response: model,
		};
	}
}
