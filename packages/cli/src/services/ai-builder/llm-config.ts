import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';

const openAIKey = process.env.N8N_AI_OPENAI_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const anthropicApiKey = process.env.N8N_AI_ANTHROPIC_KEY;

export const llm = new ChatOpenAI({
	modelName: 'gpt-4o-mini',
	apiKey: openAIKey,
	temperature: 0.1,
});

export const gpt4o = new ChatOpenAI({
	modelName: 'gpt-4o',
	apiKey: openAIKey,
});

export const geminiFlashLite = new ChatGoogleGenerativeAI({
	modelName: 'gemini-2.0-flash-lite-preview-02-05',
	apiKey: geminiApiKey,
});

export const geminiFlash = new ChatGoogleGenerativeAI({
	modelName: 'gemini-2.0-flash-exp',
	apiKey: geminiApiKey,
});

export const gemini2ProExp = new ChatGoogleGenerativeAI({
	modelName: 'gemini-2.0-pro-exp-02-05',
	apiKey: geminiApiKey,
});

export const anthropicClaude35Sonnet = new ChatAnthropic({
	modelName: 'claude-3-7-sonnet-20250219',
	apiKey: anthropicApiKey,
	temperature: 0.1,
});

export const anthropicClaude35Haiku = new ChatAnthropic({
	modelName: 'claude-3-5-haiku-20241022',
	apiKey: anthropicApiKey,
});
