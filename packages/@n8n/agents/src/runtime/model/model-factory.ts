/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-require-imports */
import { ensureUrlPathSuffix } from '@n8n/ai-utilities/model-discovery';
import type { EmbeddingModel, LanguageModel } from 'ai';
import type * as Undici from 'undici';

import {
	PROVIDER_CREDENTIAL_SCHEMAS,
	type ProviderId,
	type ProviderCredentials,
} from './provider-credentials';
import type { ModelConfig } from '../../types/sdk/agent';

/**
 * A `fetch`-compatible function. Callers may inject a proxy-aware `fetch` so
 * model calls route through the configured HTTP(S)_PROXY.
 */
export type FetchFn = typeof globalThis.fetch;
export type EmbeddingProviderOptions = {
	apiKey?: string;
	baseURL?: string;
	fetch?: FetchFn;
} & Partial<ProviderCredentials<'aws-bedrock'>>;
type CreateEmbeddingProviderFn = (opts?: EmbeddingProviderOptions) => {
	embeddingModel(model: string): EmbeddingModel;
};

function isLanguageModel(config: unknown): config is LanguageModel {
	return typeof config === 'object' && config !== null && 'doGenerate' in config;
}

/**
 * Env-proxy `fetch` fallback for standalone SDK use.
 *
 * `@n8n/agents` is a standalone SDK and deliberately does not depend on `@n8n/backend-network`,
 * so it cannot build the backend's centrally-guarded transport itself.
 * Inside the n8n backend that guarded `fetch` is always injected into {@link createModel} / {@link createEmbeddingModel}
 * (see cli's `createAiProxyFetch`, which wraps `@n8n/backend-network`), and this fallback is never reached.
 */
function getProxyFetch(): FetchFn | undefined {
	const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
	if (!proxyUrl) return undefined;

	// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- standalone SDK cannot depend on @n8n/backend-network; the backend always injects its guarded transport, so this env-proxy path runs only outside the backend (see doc comment above). To drop this: make `fetch` a required arg of createModel/createEmbeddingModel and delete the fallback, so standalone callers always supply their own transport
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

type OpenAiCompatibleCreds = {
	apiKey?: string;
	baseURL?: string;
	headers?: Record<string, string>;
};

/**
 * Parse a Vertex service-account JSON string into `googleAuthOptions`.
 * Accepts either a full SA JSON blob or the subset `{ client_email, private_key }`.
 * Returns undefined when unset so ADC can take over.
 */
function parseGoogleVertexAuthOptions(
	googleCredentials: string | undefined,
): { credentials: Record<string, unknown> } | undefined {
	if (!googleCredentials?.trim()) return undefined;
	let parsed: unknown;
	try {
		parsed = JSON.parse(googleCredentials);
	} catch {
		throw new Error(
			'Invalid credentials for provider "google-vertex-anthropic": googleCredentials must be valid JSON',
		);
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error(
			'Invalid credentials for provider "google-vertex-anthropic": googleCredentials must be a JSON object',
		);
	}
	const credentials = { ...(parsed as Record<string, unknown>) };
	// SA keys often arrive with literal `\n` escapes when pasted into env files.
	if (typeof credentials.private_key === 'string') {
		credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
	}
	return { credentials };
}

/**
 * Shared builder for OpenAI-compatible HTTP providers. Prefer this over
 * `@ai-sdk/<provider>` packages that pull optional NAPI binaries or v4-only types.
 */
function buildOpenAiCompatible(
	name: string,
	defaultBaseURL: string | undefined,
	creds: OpenAiCompatibleCreds,
	model: string,
	fetch: FetchFn | undefined,
	options?: { includeUsage?: boolean; supportsStructuredOutputs?: boolean },
): LanguageModel {
	const { createOpenAICompatible } =
		require('@ai-sdk/openai-compatible') as typeof import('@ai-sdk/openai-compatible');
	const baseURL = creds.baseURL ?? defaultBaseURL;
	if (!baseURL) {
		throw new Error(`baseURL is required for OpenAI-compatible provider "${name}"`);
	}
	return createOpenAICompatible({
		name,
		baseURL,
		apiKey: creds.apiKey,
		headers: creds.headers,
		fetch,
		includeUsage: options?.includeUsage,
		supportsStructuredOutputs: options?.supportsStructuredOutputs,
	})(model);
}

type OpenAiCompatibleProviderId = 'nvidia';

function isOfficialOpenAiBaseUrl(baseURL: string | undefined): boolean {
	return baseURL?.replace(/\/+$/, '') === 'https://api.openai.com/v1';
}

function openAiCompatibleEntry<P extends OpenAiCompatibleProviderId>(
	name: P,
	defaultBaseURL: string,
	options?: { includeUsage?: boolean; supportsStructuredOutputs?: boolean },
): RegistryEntry<P> {
	return {
		build: (creds, model, fetch) =>
			buildOpenAiCompatible(name, defaultBaseURL, creds, model, fetch, options),
	};
}

/**
 * Registry of language model providers.
 * Each entry maps a provider id to a builder that loads its @ai-sdk/* package
 * and instantiates the model. Credentials are Zod-validated before being passed in.
 */
const LANGUAGE_PROVIDERS: ProviderRegistry = {
	openai: {
		build: (creds, model, fetch) => {
			const { createOpenAI } = require('@ai-sdk/openai') as typeof import('@ai-sdk/openai');
			const { apiStyle, ...providerCreds } = creds;
			const provider = createOpenAI({ ...providerCreds, fetch });
			// A custom baseURL usually means an OpenAI-COMPATIBLE server (LM Studio,
			// vLLM, Ollama), which speaks /chat/completions; the provider's default
			// model targets OpenAI's own Responses API (/responses) that those
			// servers do not implement. OpenAI credentials also carry the official
			// baseURL, so keep those on /responses. `apiStyle` handles proxies that
			// explicitly support one API or the other.
			const useChat =
				apiStyle === 'chat' ||
				(apiStyle === undefined &&
					Boolean(providerCreds.baseURL && !isOfficialOpenAiBaseUrl(providerCreds.baseURL)));
			return useChat ? provider.chat(model) : provider(model);
		},
	},
	custom: {
		build: (creds, model, fetch) =>
			buildOpenAiCompatible('custom', undefined, creds, model, fetch, {
				supportsStructuredOutputs: creds.supportsStructuredOutputs,
			}),
	},
	anthropic: {
		build: (creds, model, fetch) => {
			const { createAnthropic } =
				require('@ai-sdk/anthropic') as typeof import('@ai-sdk/anthropic');
			let normalizedBaseURL = creds.baseURL;
			// The SDK expects the versioned base (default `https://api.anthropic.com/v1`),
			// but n8n Anthropic credentials store the host without `/v1` — their
			// consumers append the version segment themselves.
			if (normalizedBaseURL) {
				const url = new URL(normalizedBaseURL);
				if (!url.pathname.replace(/\/$/, '').endsWith('/v1')) {
					url.pathname = url.pathname.replace(/\/?$/, '/v1');
					normalizedBaseURL = url.toString();
				}
			}
			return createAnthropic({ ...creds, baseURL: normalizedBaseURL, fetch })(model);
		},
	},
	'google-vertex-anthropic': {
		build: (creds, model, fetch) => {
			const { createVertexAnthropic } =
				require('@ai-sdk/google-vertex/anthropic') as typeof import('@ai-sdk/google-vertex/anthropic');
			const googleAuthOptions = parseGoogleVertexAuthOptions(creds.googleCredentials);
			return createVertexAnthropic({
				project: creds.project,
				location: creds.location,
				baseURL: creds.baseURL,
				headers: creds.headers,
				...(googleAuthOptions ? { googleAuthOptions } : {}),
				fetch,
			})(model);
		},
	},
	google: {
		build: (creds, model, fetch) => {
			const { createGoogle } = require('@ai-sdk/google') as typeof import('@ai-sdk/google');
			return createGoogle({ ...creds, fetch })(model);
		},
	},
	xai: {
		build: (creds, model, fetch) => {
			const { createXai } = require('@ai-sdk/xai') as typeof import('@ai-sdk/xai');
			return createXai({ ...creds, fetch }).chat(model);
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
	nvidia: openAiCompatibleEntry('nvidia', 'https://integrate.api.nvidia.com/v1', {}),
	moonshotai: {
		build: (creds, model, fetch) => {
			const { createMoonshotAI } =
				require('@ai-sdk/moonshotai') as typeof import('@ai-sdk/moonshotai');
			return createMoonshotAI({ ...creds, fetch })(model);
		},
	},
	alibaba: {
		build: (creds, model, fetch) => {
			const { createAlibaba } = require('@ai-sdk/alibaba') as typeof import('@ai-sdk/alibaba');
			// The SDK expects the OpenAI-compatible base, but n8n Alibaba credentials
			// store the region's bare host — Alibaba serves its native and its
			// OpenAI-compatible API under different paths on that host.
			const normalizedBaseURL = creds.baseURL
				? ensureUrlPathSuffix(creds.baseURL, '/compatible-mode/v1')
				: creds.baseURL;
			return createAlibaba({ ...creds, baseURL: normalizedBaseURL, fetch })(model);
		},
	},
	minimax: {
		build: (creds, model, fetch) => {
			const { createMiniMax } = require('@ai-sdk/minimax') as typeof import('@ai-sdk/minimax');
			// The SDK speaks MiniMax's Anthropic-compatible API, which MiniMax also
			// recommends, but n8n MiniMax credentials store the OpenAI-compatible base.
			const normalizedBaseURL = creds.baseURL
				? ensureUrlPathSuffix(creds.baseURL, '/anthropic/v1', { stripSuffix: '/v1' })
				: creds.baseURL;
			return createMiniMax({ ...creds, baseURL: normalizedBaseURL, fetch })(model);
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
export function createModel(config: ModelConfig, fetch?: FetchFn): LanguageModel {
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
	// Host configs (e.g. Instance AI's `{ id, url }` for OpenAI-compatible
	// endpoints) spell the base URL as `url`; the provider schemas only know
	// `baseURL`, and Zod strips unknown keys, so normalize before validation.
	// An EMPTY url means "no custom endpoint" (Instance AI emits `url: ''` for
	// the api-key-only config) and must keep the provider default.
	if (typeof credFields.url === 'string' && credFields.baseURL === undefined) {
		const { url, ...restCreds } = credFields;
		credFields = url ? { ...restCreds, baseURL: url } : restCreds;
	}

	const schema = PROVIDER_CREDENTIAL_SCHEMAS[provider];
	const parsed = schema.safeParse(credFields);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
			.join('\n');
		throw new Error(`Invalid credentials for provider "${provider}":\n${issues}`);
	}

	// Caller-injected transport wins; fall back to the ambient env-proxy resolver.
	const resolvedFetch = fetch ?? getProxyFetch();
	// Type cast: the registry guarantees the schema and builder are aligned per provider.
	return (entry.build as EntryBuilder<typeof provider>)(
		parsed.data as never,
		modelName,
		resolvedFetch,
	);
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
	google: { pkg: '@ai-sdk/google', factory: 'createGoogle' },
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
	options?: string | EmbeddingProviderOptions,
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
	const providerOptions = typeof options === 'string' ? { apiKey: options } : options;
	return factory(providerOptions).embeddingModel(modelName);
}
