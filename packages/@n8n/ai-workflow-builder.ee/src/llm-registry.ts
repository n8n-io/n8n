import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import {
	anthropicClaudeSonnet45,
	anthropicHaiku45,
	gpt52ReasoningOff,
	gpt52ReasoningLow,
	gpt52ReasoningHigh,
	gpt41,
	gpt41mini,
	o4mini,
	gemini3Flash,
	gemini3Pro,
} from './llm-config';

/**
 * Registry of available models with their factory functions.
 * Each factory auto-resolves API keys from environment variables.
 */
export const MODEL_REGISTRY = {
	// Anthropic models
	'claude-sonnet': () =>
		anthropicClaudeSonnet45({ apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? '' }),
	'claude-haiku': () => anthropicHaiku45({ apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? '' }),

	// OpenAI models
	gpt52: () => gpt52ReasoningOff({ apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '' }),
	'gpt52-low': () => gpt52ReasoningLow({ apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '' }),
	'gpt52-high': () => gpt52ReasoningHigh({ apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '' }),
	gpt41: () => gpt41({ apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '' }),
	'gpt41-mini': () => gpt41mini({ apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '' }),
	'o4-mini': () => o4mini({ apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '' }),

	// OpenRouter models (Gemini, etc.)
	'gemini-flash': () => gemini3Flash({ apiKey: process.env.OPENROUTER_API_KEY ?? '' }),
	'gemini-pro': () => gemini3Pro({ apiKey: process.env.OPENROUTER_API_KEY ?? '' }),
} as const;

export type ModelKey = keyof typeof MODEL_REGISTRY;

/**
 * Get a model instance by its key.
 * @param key - The model key (e.g., 'claude-sonnet', 'gpt52')
 * @returns Promise resolving to the configured model instance
 * @throws Error if model key is not found
 */
export async function getModel(key: ModelKey): Promise<BaseChatModel> {
	const factory = MODEL_REGISTRY[key];
	if (!factory) {
		const available = Object.keys(MODEL_REGISTRY).join(', ');
		throw new Error(`Unknown model: "${key}". Available: ${available}`);
	}
	return factory();
}

/**
 * Check if a string is a valid model key.
 */
export function isValidModelKey(key: string): key is ModelKey {
	return key in MODEL_REGISTRY;
}

/**
 * Get list of all available model keys.
 */
export function getAvailableModelKeys(): ModelKey[] {
	return Object.keys(MODEL_REGISTRY) as ModelKey[];
}

/**
 * Validate a model key and return it typed, or throw with available options.
 * @param key - The model key to validate
 * @returns The validated model key
 * @throws Error with list of available models if invalid
 */
export function validateModelKey(key: string): ModelKey {
	if (!isValidModelKey(key)) {
		const available = getAvailableModelKeys().join(', ');
		throw new Error(`Invalid model key: "${key}"\nAvailable models: ${available}`);
	}
	return key;
}
