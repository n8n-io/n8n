import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';

const openAIKey = process.env.N8N_AI_OPENAI_API_KEY;
const anthropicApiKey = process.env.N8N_AI_ANTHROPIC_KEY;

export const o4mini = (baseUrl?: string, apiKey?: string, headers?: Record<string, string>) =>
	new ChatOpenAI({
		modelName: 'o4-mini-2025-04-16',
		apiKey: apiKey ?? openAIKey,
		configuration: {
			baseURL: baseUrl,
			defaultHeaders: headers,
		},
	});

export const gpt41mini = (baseUrl?: string, apiKey?: string, headers?: Record<string, string>) =>
	new ChatOpenAI({
		modelName: 'gpt-4.1-mini-2025-04-14',
		apiKey: apiKey ?? openAIKey,
		temperature: 0,
		configuration: {
			baseURL: baseUrl,
			defaultHeaders: headers,
		},
	});

export const anthropicClaude37Sonnet = (
	baseUrl?: string,
	apiKey?: string,
	headers?: Record<string, string>,
) =>
	new ChatAnthropic({
		modelName: 'claude-3-7-sonnet-20250219',
		apiKey: apiKey ?? anthropicApiKey,
		temperature: 0,
		maxTokens: 16000,
		anthropicApiUrl: baseUrl,
		clientOptions: {
			defaultHeaders: headers,
		},
	});
