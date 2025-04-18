import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';

const openAIKey = process.env.N8N_AI_OPENAI_API_KEY;
const anthropicApiKey = process.env.N8N_AI_ANTHROPIC_KEY;

const gpt4oMini = (baseUrl?: string, apiKey?: string) =>
	new ChatOpenAI({
		modelName: 'gpt-4o-mini',
		apiKey: apiKey ?? openAIKey,
		temperature: 0,
		maxTokens: 16000,
		configuration: {
			baseURL: baseUrl,
		},
	});

const gpt4o = (baseUrl?: string, apiKey?: string) =>
	new ChatOpenAI({
		modelName: 'gpt-4o',
		apiKey: apiKey ?? openAIKey,
		temperature: 0,
		maxTokens: 16000,
		configuration: {
			baseURL: baseUrl,
		},
	});

const gpt41 = (baseUrl?: string, apiKey?: string) =>
	new ChatOpenAI({
		modelName: 'gpt-4.1',
		apiKey: apiKey ?? openAIKey,
		temperature: 0,
		maxTokens: 16000,
		configuration: {
			baseURL: baseUrl,
		},
	});

const gpt41mini = (baseUrl?: string, apiKey?: string) =>
	new ChatOpenAI({
		modelName: 'gpt-4.1-mini',
		apiKey: apiKey ?? openAIKey,
		temperature: 0,
		maxTokens: 16000,
		configuration: {
			baseURL: baseUrl,
		},
	});

export const o3mini = (baseUrl?: string, apiKey?: string) =>
	new ChatOpenAI({
		modelName: 'o3-mini-2025-01-31',
		apiKey: apiKey ?? openAIKey,
		configuration: {
			baseURL: baseUrl,
		},
	});

export const anthropicClaude37Sonnet = (baseUrl?: string, apiKey?: string) =>
	new ChatAnthropic({
		modelName: 'claude-3-7-sonnet-20250219',
		apiKey: anthropicApiKey,
		temperature: 0,
		maxTokens: 16000,
		anthropicApiUrl: baseUrl,
	});

const anthropicClaude35Haiku = (baseUrl?: string, apiKey?: string) =>
	new ChatAnthropic({
		modelName: 'claude-3-5-haiku-20241022',
		apiKey: apiKey ?? anthropicApiKey,
		temperature: 0,
		maxTokens: 16000,
		anthropicApiUrl: baseUrl,
	});
