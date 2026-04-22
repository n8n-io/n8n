/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { EmbeddingModel, LanguageModel } from 'ai';
import type * as Undici from 'undici';

import {
	PROVIDER_CREDENTIAL_SCHEMAS,
	type ProviderId,
	type ProviderCredentials,
} from './provider-credentials';
import type { ModelConfig } from '../types/sdk/agent';

type FetchFn = typeof globalThis.fetch;
type CreateEmbeddingProviderFn = (opts?: { apiKey?: string }) => {
	embeddingModel(model: string): EmbeddingModel;
};

function isLanguageModel(config: unknown): config is LanguageModel {
	return typeof config === 'object' && config !== null && 'doGenerate' in config;
}

/**
 * When HTTP_PROXY / HTTPS_PROXY is set (e.g. in e2e tests with MockServer),
 * return a fetch function that routes requests through the proxy. The default
 * globalThis.fetch in Node ≥18 does NOT respect these env vars, so AI SDK
 * providers would bypass the proxy without this.
 */
function getProxyFetch(): FetchFn | undefined {
	const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
	if (!proxyUrl) return undefined;

	const { ProxyAgent } = require('undici') as typeof Undici;
	const dispatcher = new ProxyAgent(proxyUrl);
	return (async (url, init) =>
		await globalThis.fetch(url, {
			...init,
			// @ts-expect-error dispatcher is a valid undici option for Node.js fetch
			dispatcher,
		})) as FetchFn;
}

type EntryBuilder<P extends ProviderId> = (
	creds: ProviderCredentials<P>,
	modelName: string,
	fetch: FetchFn | undefined,
) => LanguageModel;

type RegistryEntry<P extends ProviderId = ProviderId> = {
	build: EntryBuilder<P>;
};

type ProviderRegistry = {
	[P in ProviderId]: RegistryEntry<P>;
};

/**
 * Registry of language model providers.
 * Each entry maps a provider id to a builder that loads its @ai-sdk/* package
 * and instantiates the model. Credentials are Zod-validated before being passed in.
 */
const LANGUAGE_PROVIDERS: ProviderRegistry = {
	openai: {
		build: (creds, model, fetch) => {
			const { createOpenAI } = require('@ai-sdk/openai') as typeof import('@ai-sdk/openai');
			return createOpenAI({ ...creds, fetch })(model);
		},
	},
	anthropic: {
		build: (creds, model, fetch) => {
			const { createAnthropic } =
				require('@ai-sdk/anthropic') as typeof import('@ai-sdk/anthropic');
			return createAnthropic({ ...creds, fetch })(model);
		},
	},
	google: {
		build: (creds, model, fetch) => {
			const { createGoogleGenerativeAI } =
				require('@ai-sdk/google') as typeof import('@ai-sdk/google');
			return createGoogleGenerativeAI({ ...creds, fetch })(model);
		},
	},
	xai: {
		build: (creds, model, fetch) => {
			const { createXai } = require('@ai-sdk/xai') as typeof import('@ai-sdk/xai');
			return createXai({ ...creds, fetch })(model);
		},
	},
	groq: {
		build: (creds, model, fetch) => {
			const { createGroq } = require('@ai-sdk/groq') as typeof import('@ai-sdk/groq');
			return createGroq({ ...creds, fetch })(model);
		},
	},
	deepseek: {
		build: (creds, model, fetch) => {
			const { createDeepSeek } = require('@ai-sdk/deepseek') as typeof import('@ai-sdk/deepseek');
			return createDeepSeek({ ...creds, fetch })(model);
		},
	},
	cohere: {
		build: (creds, model, fetch) => {
			const { createCohere } = require('@ai-sdk/cohere') as typeof import('@ai-sdk/cohere');
			return createCohere({ ...creds, fetch })(model);
		},
	},
	mistral: {
		build: (creds, model, fetch) => {
			const { createMistral } = require('@ai-sdk/mistral') as typeof import('@ai-sdk/mistral');
			return createMistral({ ...creds, fetch })(model);
		},
	},
	vercel: {
		build: (creds, model, fetch) => {
			const { createGateway } = require('@ai-sdk/gateway') as typeof import('@ai-sdk/gateway');
			return createGateway({ ...creds, fetch })(model);
		},
	},
	openrouter: {
		build: (creds, model, fetch) => {
			const { createOpenRouter } =
				require('@openrouter/ai-sdk-provider') as typeof import('@openrouter/ai-sdk-provider');
			return createOpenRouter({ apiKey: creds.apiKey, baseURL: creds.baseURL, fetch })(model);
		},
	},
	'azure-openai': {
		build: (creds, model, fetch) => {
			const { createAzure } = require('@ai-sdk/azure') as typeof import('@ai-sdk/azure');
			const { baseURL, resourceName, apiVersion, apiKey } = creds;
			let normalizedBaseURL = baseURL;
			// SDK expects url like `https://resourceName.openai.azure.com/openai`
			if (normalizedBaseURL) {
				const url = new URL(normalizedBaseURL);
				if (!url.pathname.endsWith('/openai')) {
					url.pathname = url.pathname.replace(/\/?$/, '/openai');
					normalizedBaseURL = url.toString();
				}
			}
			return createAzure({ resourceName, apiKey, baseURL: normalizedBaseURL, apiVersion, fetch })(
				model,
			);
		},
	},
	'aws-bedrock': {
		build: (creds, model, fetch) => {
			const { createAmazonBedrock } =
				require('@ai-sdk/amazon-bedrock') as typeof import('@ai-sdk/amazon-bedrock');
			return createAmazonBedrock({
				region: creds.region,
				accessKeyId: creds.accessKeyId,
				secretAccessKey: creds.secretAccessKey,
				sessionToken: creds.sessionToken,
				fetch,
			})(model);
		},
	},
};

const SUPPORTED_PROVIDERS = Object.keys(LANGUAGE_PROVIDERS).join(', ');

/**
 * Provider packages are loaded dynamically via require() so only the
 * provider needed at runtime must be installed.
 */
export function createModel(config: ModelConfig): LanguageModel {
	if (isLanguageModel(config)) {
		return config;
	}

	const rawId = typeof config === 'string' ? config : config.id;
	if (!rawId || rawId.trim() === '') {
		throw new Error('Model ID is required');
	}

	const slashIndex = rawId.indexOf('/');
	if (slashIndex <= 0) {
		throw new Error(`Invalid model ID "${rawId}": expected "provider/model-name" format`);
	}
	const provider = rawId.slice(0, slashIndex) as ProviderId;
	const modelName = rawId.slice(slashIndex + 1);

	const entry = LANGUAGE_PROVIDERS[provider];
	if (!entry) {
		throw new Error(
			`Unsupported provider: "${provider}". Supported providers: ${SUPPORTED_PROVIDERS}`,
		);
	}

	// Collect credential fields: strip `id`, pass the rest to Zod validation.
	let credFields: Record<string, unknown> = {};
	if (typeof config !== 'string') {
		const { id: _id, ...rest } = config as { id: string; [k: string]: unknown };
		credFields = rest;
	}

	const schema = PROVIDER_CREDENTIAL_SCHEMAS[provider];
	const parsed = schema.safeParse(credFields);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
			.join('\n');
		throw new Error(`Invalid credentials for provider "${provider}":\n${issues}`);
	}

	const fetch = getProxyFetch();
	// Type cast: the registry guarantees the schema and builder are aligned per provider.
	return (entry.build as EntryBuilder<typeof provider>)(parsed.data as never, modelName, fetch);
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
