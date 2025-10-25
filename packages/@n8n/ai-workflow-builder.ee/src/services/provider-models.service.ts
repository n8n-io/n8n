import type { MultiModalConfig } from '../types/multi-modal';

interface ProviderModel {
	id: string;
	name: string;
	description?: string;
	contextLength?: number;
}

interface ModelCache {
	models: ProviderModel[];
	timestamp: number;
}

// Cache TTL: 1 hour
const CACHE_TTL = 60 * 60 * 1000;
const modelCache = new Map<string, ModelCache>();

/**
 * Fetch models from OpenRouter API
 */
async function fetchOpenRouterModels(apiKey?: string): Promise<ProviderModel[]> {
	try {
		const response = await fetch('https://openrouter.ai/api/v1/models', {
			headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
		});

		if (!response.ok) {
			throw new Error(`OpenRouter API error: ${response.statusText}`);
		}

		const data = await response.json();
		return data.data.map((model: any) => ({
			id: model.id,
			name: model.name || model.id,
			description: model.description,
			contextLength: model.context_length,
		}));
	} catch (error) {
		console.error('Error fetching OpenRouter models:', error);
		return getFallbackModels('openrouter');
	}
}

/**
 * Fetch models from OpenAI API
 */
async function fetchOpenAIModels(apiKey?: string): Promise<ProviderModel[]> {
	try {
		if (!apiKey) {
			return getFallbackModels('openai');
		}

		const response = await fetch('https://api.openai.com/v1/models', {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.statusText}`);
		}

		const data = await response.json();
		// Filter to only chat models (gpt-* models)
		return data.data
			.filter((model: any) => model.id.startsWith('gpt-'))
			.map((model: any) => ({
				id: model.id,
				name: model.id,
				description: `Created: ${new Date(model.created * 1000).toLocaleDateString()}`,
			}));
	} catch (error) {
		console.error('Error fetching OpenAI models:', error);
		return getFallbackModels('openai');
	}
}

/**
 * Fetch models from Google Gemini API
 */
async function fetchGoogleModels(apiKey?: string): Promise<ProviderModel[]> {
	try {
		if (!apiKey) {
			return getFallbackModels('google');
		}

		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
		);

		if (!response.ok) {
			throw new Error(`Google API error: ${response.statusText}`);
		}

		const data = await response.json();
		// Filter to only generative models
		return data.models
			.filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
			.map((model: any) => ({
				id: model.name.replace('models/', ''),
				name: model.displayName || model.name,
				description: model.description,
			}));
	} catch (error) {
		console.error('Error fetching Google models:', error);
		return getFallbackModels('google');
	}
}

/**
 * Fetch models from Groq API
 */
async function fetchGroqModels(apiKey?: string): Promise<ProviderModel[]> {
	try {
		if (!apiKey) {
			return getFallbackModels('groq');
		}

		const response = await fetch('https://api.groq.com/openai/v1/models', {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Groq API error: ${response.statusText}`);
		}

		const data = await response.json();
		return data.data.map((model: any) => ({
			id: model.id,
			name: model.id,
			description: `Owned by: ${model.owned_by}`,
		}));
	} catch (error) {
		console.error('Error fetching Groq models:', error);
		return getFallbackModels('groq');
	}
}

/**
 * Fetch models from Cohere API
 */
async function fetchCohereModels(apiKey?: string): Promise<ProviderModel[]> {
	try {
		if (!apiKey) {
			return getFallbackModels('cohere');
		}

		const response = await fetch('https://api.cohere.ai/v1/models', {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Cohere API error: ${response.statusText}`);
		}

		const data = await response.json();
		// Filter to chat models
		return data.models
			.filter((model: any) => model.endpoints?.includes('chat'))
			.map((model: any) => ({
				id: model.name,
				name: model.name,
				description: `Context length: ${model.context_length}`,
			}));
	} catch (error) {
		console.error('Error fetching Cohere models:', error);
		return getFallbackModels('cohere');
	}
}

/**
 * Fallback hardcoded models for each provider
 */
function getFallbackModels(provider: string): ProviderModel[] {
	const fallbackModels: Record<string, ProviderModel[]> = {
		openrouter: [
			{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)' },
			{ id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)' },
			{ id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (via OpenRouter)' },
			{ id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5 (via OpenRouter)' },
			{ id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B (via OpenRouter)' },
		],
		openai: [
			{ id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
			{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
			{ id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation' },
			{ id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Efficient legacy model' },
		],
		anthropic: [
			{
				id: 'claude-3-5-sonnet-20241022',
				name: 'Claude 3.5 Sonnet',
				description: 'Best for complex tasks',
			},
			{
				id: 'claude-3-5-haiku-20241022',
				name: 'Claude 3.5 Haiku',
				description: 'Fast and efficient',
			},
			{ id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable' },
		],
		google: [
			{ id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
			{ id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and efficient' },
			{ id: 'gemini-pro', name: 'Gemini Pro', description: 'Previous generation' },
		],
		groq: [
			{ id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', description: 'Most capable' },
			{ id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Fast inference' },
			{ id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Large context' },
		],
		cohere: [
			{ id: 'command-r-plus', name: 'Command R+', description: 'Most capable' },
			{ id: 'command-r', name: 'Command R', description: 'Balanced performance' },
			{ id: 'command', name: 'Command', description: 'General purpose' },
		],
	};

	return fallbackModels[provider] || [];
}

/**
 * Get cached models or fetch fresh ones
 */
function getCachedModels(provider: string): ProviderModel[] | null {
	const cached = modelCache.get(provider);
	if (!cached) return null;

	const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
	if (isExpired) {
		modelCache.delete(provider);
		return null;
	}

	return cached.models;
}

/**
 * Set models in cache
 */
function setCachedModels(provider: string, models: ProviderModel[]): void {
	modelCache.set(provider, {
		models,
		timestamp: Date.now(),
	});
}

/**
 * Main function to get provider models
 */
export async function getProviderModels(
	provider: MultiModalConfig['provider'],
	apiKey?: string,
): Promise<ProviderModel[]> {
	// Check cache first
	const cached = getCachedModels(provider);
	if (cached) {
		return cached;
	}

	let models: ProviderModel[];

	switch (provider) {
		case 'openrouter':
			models = await fetchOpenRouterModels(apiKey);
			break;
		case 'openai':
			models = await fetchOpenAIModels(apiKey);
			break;
		case 'google':
			models = await fetchGoogleModels(apiKey);
			break;
		case 'groq':
			models = await fetchGroqModels(apiKey);
			break;
		case 'cohere':
			models = await fetchCohereModels(apiKey);
			break;
		case 'anthropic':
			// Anthropic doesn't have a public models API
			models = getFallbackModels('anthropic');
			break;
		default:
			models = [];
	}

	// Cache the results
	setCachedModels(provider, models);

	return models;
}

/**
 * Clear cache for a specific provider or all providers
 */
export function clearModelCache(provider?: string): void {
	if (provider) {
		modelCache.delete(provider);
	} else {
		modelCache.clear();
	}
}
