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
					{ name: 'Anthropic: Claude 3 Opus', value: 'anthropic/claude-3-opus' },
					{ name: 'Anthropic: Claude 3.5 Haiku', value: 'anthropic/claude-3-5-haiku-20241022' },
					{ name: 'Anthropic: Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
					{ name: 'Anthropic: Claude 3.7 Sonnet', value: 'anthropic/claude-3.7-sonnet' },
					{ name: 'Anthropic: Claude 3.7 Sonnet Reasoning', value: 'anthropic/claude-3.7-sonnet:thinking' },
					{ name: 'Cohere: Command R (08-2024)', value: 'cohere/command-r-08-2024' },
					{ name: 'Cohere: Command R+ (08-2024)', value: 'cohere/command-r-plus-08-2024' },
					{ name: 'DeepSeek V3', value: 'deepseek/deepseek-chat' },
					{ name: 'DeepSeek: DeepSeek R1', value: 'deepseek/deepseek-r1' },
					{ name: 'DeepSeek: DeepSeek R1 (nitro)', value: 'deepseek/deepseek-r1:nitro' },
					{ name: 'DeepSeek: DeepSeek V3 0324', value: 'deepseek/deepseek-chat-v3-0324' },
					{ name: 'Dolphin 2.6 Mixtral 8x7B', value: 'cognitivecomputations/dolphin-mixtral-8x7b' },
					{ name: 'EVA Qwen2.5 14B', value: 'eva-unit-01/eva-qwen-2.5-14b' },
					{ name: 'Goliath 120B', value: 'alpindale/goliath-120b' },
					{ name: 'Google: Gemini 2.5 Flash Preview', value: 'google/gemini-2.5-flash-preview' },
					{ name: 'Google: Gemini 2.5 Flash Preview Reasoning', value: 'google/gemini-2.5-flash-preview:thinking' },
					{ name: 'Google: Gemini Flash 2.08B', value: 'google/gemini-2.0-flash-001' },
					{ name: 'Google: Gemini Pro 1.5', value: 'google/gemini-pro-1.5' },
					{ name: 'Google: Gemini Pro 2.5 Preview', value: 'google/gemini-2.5-pro-preview-03-25' },
					{ name: 'Google: Gemma 2 27B', value: 'google/gemma-2-27b-it' },
					{ name: 'Gryphe: MythoMax L2 13B 8k', value: 'gryphe/mythomax-l2-13b' },
					{ name: 'Meta: Llama 3 70B Instruct (nitro)', value: 'meta-llama/llama-3-70b-instruct:nitro' },
					{ name: 'Meta: Llama 3.1 405B Instruct', value: 'meta-llama/llama-3.1-405b-instruct' },
					{ name: 'Meta: Llama 3.1 70B Instruct', value: 'meta-llama/llama-3.1-70b-instruct' },
					{ name: 'Meta: Llama 3.3 70B Instruct', value: 'meta-llama/llama-3.3-70b-instruct' },
					{ name: 'Meta: Llama 4 Maverick', value: 'meta-llama/llama-4-maverick' },
					{ name: 'Microsoft: Phi 4', value: 'microsoft/phi-4' },
					{ name: 'Mistral: Codestral Mamba', value: 'mistralai/codestral-mamba' },
					{ name: 'Mistral: Large', value: 'mistralai/mistral-large' },
					{ name: 'Mistral: Mixtral 8x7B', value: 'mistralai/mixtral-8x7b-instruct' },
					{ name: 'NVIDIA: Llama 3.1 Nemotron 70B Instruct', value: 'nvidia/llama-3.1-nemotron-70b-instruct' },
					{ name: 'NVIDIA: Llama 3.1 Nemotron Ultra 253B v1', value: 'nvidia/llama-3.1-nemotron-ultra-253b-v1:free' },
					{ name: 'NVIDIA: Llama 3.3 Nemotron Super 49B v1', value: 'nvidia/llama-3.1-nemotron-70b-instruct' },
					{ name: 'OpenAI: GPT-4.1', value: 'openai/gpt-4.1' },
					{ name: 'OpenAI: GPT-4.1 Mini', value: 'openai/gpt-4.1-mini' },
					{ name: 'OpenAI: GPT-4.1 Nano', value: 'openai/gpt-4.1-nano' },
					{ name: 'OpenAI: GPT-4o - (Aug-06)', value: 'openai/gpt-4o-2024-08-06' },
					{ name: 'OpenAI: GPT-4o - (Nov-20)', value: 'openai/gpt-4o-2024-11-20' },
					{ name: 'OpenAI: GPT-4o mini', value: 'openai/gpt-4o-mini' },
					{ name: 'OpenAI: o1', value: 'openai/o1' },
					{ name: 'OpenAI: o1 Pro', value: 'openai/o1-pro' },
					{ name: 'OpenAI: o1-mini', value: 'openai/o1-mini' },
					{ name: 'OpenAI: o3 Mini (High)', value: 'openai/o3-mini-high' },
					{ name: 'OpenAI: o3 Mini (Medium)', value: 'openai/o3-mini' },
					{ name: 'OpenAI: o4 Mini', value: 'openai/o4-mini' },
					{ name: 'OpenAI: o4 Mini High', value: 'openai/o4-mini-high' },
					{ name: 'Perplexity: Llama 3.1 Sonar 70B Online', value: 'perplexity/llama-3.1-sonar-large-128k-online' },
					{ name: 'Perplexity: Llama 3.1 Sonar 8B Online', value: 'perplexity/llama-3.1-sonar-small-128k-online' },
					{ name: 'Perplexity: Sonar', value: 'perplexity/sonar' },
					{ name: 'Perplexity: Sonar Deep Research', value: 'perplexity/sonar-deep-research' },
					{ name: 'Perplexity: Sonar Reasoning', value: 'perplexity/sonar-reasoning' },
					{ name: 'Qwen2-VL 72B Instruct', value: 'qwen/qwen-2-vl-72b-instruct' },
					{ name: 'Qwen2.5 72B Instruct', value: 'qwen/qwen-2.5-72b-instruct' },
					{ name: 'Qwen2.5 Coder 32B Instruct', value: 'qwen/qwen-2.5-coder-32b-instruct' },
					{ name: 'Qwen: QwQ 32B Preview', value: 'qwen/qwq-32b-preview' },
					{ name: 'Qwen: Qwen2.5 VL 32B Instruct', value: 'qwen/qwen2.5-vl-32b-instruct:free' },
					{ name: 'Qwen: Qwen3 235B A22B', value: 'qwen/qwen3-235b-a22b' },
					{ name: 'WizardLM-2 8x22B', value: 'microsoft/wizardlm-2-8x22b' },
					{ name: 'xAI: Grok 2 1212', value: 'x-ai/grok-2-1212' },
					{ name: 'xAI: Grok 3 Beta', value: 'x-ai/grok-3-beta' },
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
