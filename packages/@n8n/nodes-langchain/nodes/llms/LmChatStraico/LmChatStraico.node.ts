/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getHttpProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

export class LmChatStraico implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Straico Chat Model',
		name: 'lmChatStraico',
		icon: { light: 'file:straico.svg', dark: 'file:straico.svg' },
		group: ['transform'],
		version: [1],
		description: 'Expose Straico chat-completion models for AI chains and the AI-Agent',
		defaults: { name: 'Straico Chat Model' },
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
		},

		/* ---------- connections ---------- */
		inputs: [], // root LLM node
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],

		/* ---------- credentials ---------- */
		credentials: [
			{
				name: 'straicoApi', // define this credential → apiKey + url
				required: true,
			},
		],

		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials?.url }}', // fallback to credential URL
		},

		/* ---------- properties ---------- */
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),

			/* --- model picker -------------------------------------------------- */
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				required: true,
				default: 'anthropic/claude-3.5-sonnet',
				description: 'Choose the Straico model to generate the completion.',
				options: [
					{ name: 'Amazon: Nova Lite 1.0', value: 'amazon/nova-lite-v1' },
					{ name: 'Amazon: Nova Micro 1.0', value: 'amazon/nova-micro-v1' },
					{ name: 'Amazon: Nova Pro 1.0', value: 'amazon/nova-pro-v1' },
					/* … → keep the whole list you posted … */
					{ name: 'xAI: Grok 3 Mini Beta', value: 'x-ai/grok-3-mini-beta' },
				],
				routing: {
					send: { type: 'body', property: 'model' },
				},
			},

			/* --- generation parameters --------------------------------------- */
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 0, maxValue: 2 },
					},
					{
						displayName: 'Top P',
						name: 'top_p',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 0, maxValue: 1 },
					},
					{
						displayName: 'Max Tokens',
						name: 'max_tokens',
						type: 'number',
						default: 1024,
					},
					{
						displayName: 'Presence Penalty',
						name: 'presence_penalty',
						type: 'number',
						default: 0,
						typeOptions: { minValue: -2, maxValue: 2 },
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequency_penalty',
						type: 'number',
						default: 0,
						typeOptions: { minValue: -2, maxValue: 2 },
					},
					{
						displayName: 'Timeout (ms)',
						name: 'timeout',
						type: 'number',
						default: 60000,
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 2,
					},
				],
			},
		],
	};

	/* --------------------------------------------------------------------- */
	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<OpenAICompatibleCredential>('straicoApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const rawOptions = this.getNodeParameter('options', itemIndex, {}) as Record<string, any>;

		/** map snake_case → camelCase for LangChain */
		const options = {
			temperature: rawOptions.temperature,
			topP: rawOptions.top_p,
			maxTokens: rawOptions.max_tokens,
			presencePenalty: rawOptions.presence_penalty,
			frequencyPenalty: rawOptions.frequency_penalty,
			timeout: rawOptions.timeout ?? 60000,
			maxRetries: rawOptions.maxRetries ?? 2,
		};

		const configuration: ClientOptions = {
			baseURL: credentials.url || 'https://api.straico.com/v0',
			httpAgent: getHttpProxyAgent(),
		};

		const model = new ChatOpenAI({
			openAIApiKey: credentials.apiKey,
			modelName,
			...options,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
		});

		return { response: model };
	}
}