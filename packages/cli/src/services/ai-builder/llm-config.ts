import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';

const openAIKey = process.env.N8N_AI_OPENAI_API_KEY;
const anthropicApiKey = process.env.N8N_AI_ANTHROPIC_KEY;

export const gpt4oMini = new ChatOpenAI({
	modelName: 'gpt-4o-mini',
	apiKey: openAIKey,
	temperature: 0,
});

export const gpt4o = new ChatOpenAI({
	modelName: 'gpt-4o',
	apiKey: openAIKey,
	temperature: 0,
});

export const o3mini = new ChatOpenAI({
	modelName: 'o3-mini-2025-01-31',
	apiKey: openAIKey,
});

export const anthropicClaude35Sonnet = new ChatAnthropic({
	modelName: 'claude-3-7-sonnet-20250219',
	apiKey: anthropicApiKey,
	temperature: 0,
	maxTokens: 16000,
});

export const anthropicClaude35Haiku = new ChatAnthropic({
	modelName: 'claude-3-5-haiku-20241022',
	apiKey: anthropicApiKey,
	temperature: 0,
	maxTokens: 16000,
});
