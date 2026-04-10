/* eslint-disable @typescript-eslint/no-require-imports */
import type { EmbeddingModel, LanguageModel } from 'ai';

import type { ModelConfig } from '../types/sdk/agent';

type CreateProviderFn = (opts?: {
	apiKey?: string;
	baseURL?: string;
}) => (model: string) => LanguageModel;
type CreateEmbeddingProviderFn = (opts?: { apiKey?: string }) => {
	embeddingModel(model: string): EmbeddingModel;
};

function isLanguageModel(config: unknown): config is LanguageModel {
	return typeof config === 'object' && config !== null && 'doGenerate' in config;
}

/**
 * Provider packages are loaded dynamically via require() so only the
 * provider needed at runtime must be installed.
 */
export function createModel(config: ModelConfig): LanguageModel {
	if (isLanguageModel(config)) {
		return config;
	}

	const stripEmpty = <T>(value: T | undefined): T | undefined => {
		if (!value) return undefined;
		if (typeof value === 'string' && value.trim() === '') return undefined;
		return value;
	};

	const modelId = stripEmpty(typeof config === 'string' ? config : config.id);
	const apiKey = stripEmpty(typeof config === 'string' ? undefined : config.apiKey);
	const baseURL = stripEmpty(typeof config === 'string' ? undefined : config.url);

	if (!modelId) {
		throw new Error('Model ID is required');
	}

	const [provider, ...rest] = modelId.split('/');
	const modelName = rest.join('/');

	switch (provider) {
		case 'anthropic': {
			const { createAnthropic } = require('@ai-sdk/anthropic') as {
				createAnthropic: CreateProviderFn;
			};
			return createAnthropic({ apiKey, baseURL })(modelName);
		}
		case 'openai': {
			const { createOpenAI } = require('@ai-sdk/openai') as {
				createOpenAI: CreateProviderFn;
			};
			return createOpenAI({ apiKey, baseURL })(modelName);
		}
		case 'google': {
			const { createGoogleGenerativeAI } = require('@ai-sdk/google') as {
				createGoogleGenerativeAI: CreateProviderFn;
			};
			return createGoogleGenerativeAI({ apiKey, baseURL })(modelName);
		}
		case 'xai': {
			const { createXai } = require('@ai-sdk/xai') as {
				createXai: CreateProviderFn;
			};
			return createXai({ apiKey, baseURL })(modelName);
		}
		default:
			throw new Error(
				`Unsupported provider: "${provider}". Supported: anthropic, openai, google, xai`,
			);
	}
}

/**
 * Registry of embedding provider packages and their factory function names.
 * Each AI SDK provider follows the same pattern:
 *   createProvider({ apiKey }).embeddingModel(modelName)
 *
 * To add a new provider, install its @ai-sdk/* package and add an entry here.
 */
const EMBEDDING_PROVIDERS = {
	openai: { pkg: '@ai-sdk/openai', factory: 'createOpenAI' },
	google: { pkg: '@ai-sdk/google', factory: 'createGoogleGenerativeAI' },
	mistral: { pkg: '@ai-sdk/mistral', factory: 'createMistral' },
	cohere: { pkg: '@ai-sdk/cohere', factory: 'createCohere' },
	amazon: { pkg: '@ai-sdk/amazon-bedrock', factory: 'createAmazonBedrock' },
	bedrock: { pkg: '@ai-sdk/amazon-bedrock', factory: 'createAmazonBedrock' },
} as const;

type EmbeddingProvider = keyof typeof EMBEDDING_PROVIDERS;
type EmbeddingModelId = `${EmbeddingProvider}/${string}`;

/**
 * Create an embedding model from a "provider/model" string (e.g. "openai/text-embedding-3-small").
 * Supports any AI SDK provider that exposes `.embeddingModel()`.
 * The provider package must be installed at runtime.
 */
export function createEmbeddingModel(
	embedderString: EmbeddingModelId | (string & {}),
	apiKey?: string,
): EmbeddingModel {
	const [provider, ...rest] = embedderString.split('/');
	const modelName = rest.join('/');

	const entry = EMBEDDING_PROVIDERS[provider as EmbeddingProvider];
	if (!entry) {
		const supported = Object.keys(EMBEDDING_PROVIDERS).join(', ');
		throw new Error(`Unsupported embedding provider: "${provider}". Supported: ${supported}`);
	}

	const mod = require(entry.pkg) as Record<string, CreateEmbeddingProviderFn>;
	const factory = mod[entry.factory];
	return factory({ apiKey }).embeddingModel(modelName);
}
