// Different LLMConfig type for this file - specific to LLM providers
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { MAX_OUTPUT_TOKENS } from '@/constants';

import { getProxyAgent } from './utils/http-proxy-agent';

/**
 * Configuration for LLM provider initialization.
 */
export interface LLMProviderConfig {
	apiKey: string;
	baseUrl?: string;
	headers?: Record<string, string>;
}

export const gpt52 = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'gpt-5.2-2025-12-11',
		apiKey: config.apiKey,
		temperature: 0,
		maxTokens: -1,
		configuration: {
			baseURL: config.baseUrl,
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://api.openai.com/v1'),
			},
		},
	});
};

export const anthropicClaudeSonnet45 = async (config: LLMProviderConfig) => {
	const { ChatAnthropic } = await import('@langchain/anthropic');
	const model = new ChatAnthropic({
		model: 'claude-sonnet-4-5-20250929',
		apiKey: config.apiKey,
		temperature: 0,
		maxTokens: MAX_OUTPUT_TOKENS,
		anthropicApiUrl: config.baseUrl,
		clientOptions: {
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl),
			},
		},
	});

	// Remove Langchain default topP parameter since Sonnet 4.5 doesn't allow setting both temperature and topP
	delete model.topP;

	return model;
};
export const anthropicClaudeSonnet45Think = async (config: LLMProviderConfig) => {
	const { ChatAnthropic } = await import('@langchain/anthropic');
	const model = new ChatAnthropic({
		model: 'claude-sonnet-4-5-20250929',
		apiKey: config.apiKey,
		maxTokens: MAX_OUTPUT_TOKENS,
		anthropicApiUrl: config.baseUrl,
		thinking: {
			budget_tokens: 10000,
			type: 'enabled',
		},
		clientOptions: {
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl),
			},
		},
	});

	// Remove Langchain default topP parameter since Sonnet 4.5 doesn't allow setting both temperature and topP
	delete model.topP;
	delete model.temperature;

	return model;
};

export const anthropicHaiku45 = async (config: LLMProviderConfig) => {
	const { ChatAnthropic } = await import('@langchain/anthropic');
	const model = new ChatAnthropic({
		model: 'claude-haiku-4-5-20251001',
		apiKey: config.apiKey,
		temperature: 0,
		maxTokens: MAX_OUTPUT_TOKENS,
		anthropicApiUrl: config.baseUrl,
		clientOptions: {
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl),
			},
		},
	});

	// Remove Langchain default topP parameter since Sonnet 4.5 doesn't allow setting both temperature and topP
	delete model.topP;

	return model;
};

export const anthropicClaudeOpus45 = async (config: LLMProviderConfig) => {
	const { ChatAnthropic } = await import('@langchain/anthropic');
	const model = new ChatAnthropic({
		model: 'claude-opus-4-5-20251101',
		apiKey: config.apiKey,
		temperature: 0,
		maxTokens: MAX_OUTPUT_TOKENS,
		anthropicApiUrl: config.baseUrl,
		clientOptions: {
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl),
			},
		},
	});

	// Remove Langchain default topP parameter since Opus 4.5 doesn't allow setting both temperature and topP
	delete model.topP;

	return model;
};

// ============================================================================
// OpenRouter Models
// ============================================================================

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Creates an OpenRouter model factory for a given model name.
 * Uses OpenAI-compatible API with OpenRouter base URL.
 */
function createOpenRouterModel(modelName: string) {
	return async (config: LLMProviderConfig) => {
		const { ChatOpenAI } = await import('@langchain/openai');
		return new ChatOpenAI({
			model: modelName,
			apiKey: config.apiKey,
			temperature: 0,
			maxTokens: -1,
			configuration: {
				baseURL: OPENROUTER_BASE_URL,
				defaultHeaders: {
					...config.headers,
					'HTTP-Referer': 'https://n8n.io',
					'X-Title': 'n8n AI Workflow Builder',
				},
				fetchOptions: {
					dispatcher: getProxyAgent(OPENROUTER_BASE_URL),
				},
			},
		});
	};
}

// OpenRouter model factories
export const glm47 = createOpenRouterModel('thudm/glm-4-plus');
export const gemini3Flash = createOpenRouterModel('google/gemini-3-flash-preview');
export const deepseekV32 = createOpenRouterModel('deepseek/deepseek-chat-v3-0324');
export const gemini3Pro = createOpenRouterModel('google/gemini-3-pro-preview');
export const devstral = createOpenRouterModel('mistralai/devstral-small');

// ============================================================================
// Model Registry
// ============================================================================

/**
 * IMPORTANT: Generation stages currently only support Anthropic models.
 *
 * Non-Anthropic models (OpenAI, OpenRouter) are available for evaluation/judging
 * purposes only. Using them for generation stages (supervisor, discovery, builder,
 * responder, parameterUpdater) will likely fail due to:
 *
 * 1. Prompt caching: Our prompts use Anthropic's cache_control for efficiency
 * 2. Tool schemas: add_nodes and update_parameters tools use passthrough() schemas
 *    which only Anthropic models handle correctly
 *
 * TODO: Add provider-agnostic prompt/tool support to enable non-Anthropic generation.
 */

/**
 * Available model identifiers for the eval CLI.
 * These can be used with --model, --judge-model, and per-stage model flags.
 */
export type ModelId =
	// Native models
	| 'claude-opus-4.5'
	| 'claude-sonnet-4.5'
	| 'claude-sonnet-4.5-think'
	| 'claude-haiku-4.5'
	| 'gpt-5.2'
	// OpenRouter models
	| 'glm-4.7'
	| 'gemini-3-flash'
	| 'deepseek-v3.2'
	| 'gemini-3-pro'
	| 'devstral';

/**
 * Model factory functions mapped by model ID.
 */
export const MODEL_FACTORIES: Record<
	ModelId,
	(config: LLMProviderConfig) => Promise<BaseChatModel>
> = {
	// Native models
	'claude-opus-4.5': anthropicClaudeOpus45,
	'claude-sonnet-4.5': anthropicClaudeSonnet45,
	'claude-sonnet-4.5-think': anthropicClaudeSonnet45Think,
	'claude-haiku-4.5': anthropicHaiku45,
	'gpt-5.2': gpt52,
	// OpenRouter models
	'glm-4.7': glm47,
	'gemini-3-flash': gemini3Flash,
	'deepseek-v3.2': deepseekV32,
	'gemini-3-pro': gemini3Pro,
	devstral,
};

/** OpenRouter model IDs for API key resolution */
const OPENROUTER_MODELS: ModelId[] = [
	'glm-4.7',
	'gemini-3-flash',
	'deepseek-v3.2',
	'gemini-3-pro',
	'devstral',
];

/**
 * Get the required API key environment variable for a model.
 */
export function getApiKeyEnvVar(modelId: ModelId): string {
	if (OPENROUTER_MODELS.includes(modelId)) {
		return 'OPENROUTER_API_KEY';
	}
	if (modelId.startsWith('gpt')) {
		return 'N8N_AI_OPENAI_KEY';
	}
	return 'N8N_AI_ANTHROPIC_KEY';
}

/**
 * List of available model IDs for CLI help text.
 * Explicitly defined to avoid type casting Object.keys().
 */
export const AVAILABLE_MODELS: readonly ModelId[] = [
	// Native models
	'claude-opus-4.5',
	'claude-sonnet-4.5',
	'claude-haiku-4.5',
	'gpt-5.2',
	// OpenRouter models
	'glm-4.7',
	'gemini-3-flash',
	'deepseek-v3.2',
	'gemini-3-pro',
	'devstral',
] as const;

/**
 * Default model used when no model is specified.
 */
export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4.5';
