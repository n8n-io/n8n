/**
 * Example usage of multi-modal AI integration in Build with AI feature
 */

import type { MultiModalConfig } from '@/types/multi-modal';
import { PROVIDERS, getDefaultConfig } from '@/types/multi-modal';

// Example 1: Using OpenAI GPT-4o
const openaiConfig: Partial<MultiModalConfig> = {
	provider: 'openai',
	model: 'gpt-4o',
	apiKey: 'your-openai-api-key',
	temperature: 0.7,
	maxTokens: 4000,
};

// Example 2: Using Anthropic Claude
const anthropicConfig: Partial<MultiModalConfig> = {
	provider: 'anthropic',
	model: 'claude-3-5-sonnet-20241022',
	apiKey: 'your-anthropic-api-key',
	temperature: 0.3,
};

// Example 3: Using Google Gemini
const googleConfig: Partial<MultiModalConfig> = {
	provider: 'google',
	model: 'gemini-1.5-pro',
	apiKey: 'your-google-api-key',
};

// Example 4: Using Groq for fast inference
const groqConfig: Partial<MultiModalConfig> = {
	provider: 'groq',
	model: 'llama-3.1-70b-versatile',
	apiKey: 'your-groq-api-key',
	temperature: 0.1, // Lower temperature for more deterministic outputs
};

// Example 5: Using Cohere
const cohereConfig: Partial<MultiModalConfig> = {
	provider: 'cohere',
	model: 'command-r-plus',
	apiKey: 'your-cohere-api-key',
};

// Get available providers and their models
export function getAvailableProviders() {
	return PROVIDERS.map((provider) => ({
		name: provider.name,
		value: provider.value,
		models: provider.models,
		defaultConfig: getDefaultConfig(provider.value),
	}));
}

// Environment variable configuration (recommended for production)
export const ENV_CONFIG_EXAMPLES = {
	// Set these in your .env file:
	N8N_AI_OPENAI_KEY: 'your-openai-api-key',
	N8N_AI_ANTHROPIC_KEY: 'your-anthropic-api-key',
	N8N_AI_GOOGLE_KEY: 'your-google-api-key',
	N8N_AI_GROQ_KEY: 'your-groq-api-key',
	N8N_AI_COHERE_KEY: 'your-cohere-api-key',
};
