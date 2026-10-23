/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-require-imports */
import { AZURE_FOUNDRY_ANTHROPIC_PREFIX, splitModelId } from '@n8n/ai-utilities/agent-config';
import {
	AZURE_AI_FOUNDRY_AUDIENCE,
	ensureUrlPathSuffix,
	getAzureFoundryOrigin,
	isOpenAiCustomEndpoint,
} from '@n8n/ai-utilities/model-discovery';
import type { ClientOAuth2Options } from '@n8n/client-oauth2';
import { isRecord } from '@n8n/utils/is-record';
import type { EmbeddingModel, LanguageModel } from 'ai';
import type * as Undici from 'undici';

import { createGoogleVertexModel, parseGoogleVertexAuthOptions } from './google-vertex';
import type { NativeToolDeferral } from './native-tool-deferral';
import { anthropicToolDeferral } from './native-tool-deferral/anthropic';
import { openAiToolDeferral } from './native-tool-deferral/openai';
import { wrapOpenRouterModel } from './openrouter';
import { isAnthropicMessagesProvider } from './prompt-cache';
import {
	endpointRouteKey,
	guardOpenAiRoutes,
	withChatCompletionsFallback,
} from './openai-api-style';
import {
	PROVIDER_CREDENTIAL_SCHEMAS,
	isAzureEntraCredential,
	type ProviderId,
	type ProviderCredentials,
} from './provider-credentials';
import type { BuiltTelemetry } from '../../types/telemetry';
import { traceModelRequests } from '../telemetry/model-request-tracing';
import type { ModelConfig } from '../../types/sdk/agent';
import { getModelIdString } from '../../utils/model';

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
/**
 * Resolves `globalThis.fetch` per request, the same way the SDK does when no
 * `fetch` is passed, so a transport installed after the model was built is used.
 */
const globalFetch: FetchFn = async (input, init) => await globalThis.fetch(input, init);

function getProxyFetch(): FetchFn | undefined {
	const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
	if (!proxyUrl) return undefined;

	// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- standalone SDK cannot depend on @n8n/backend-network; the backend always injects its guarded transport, so this env-proxy path runs only outside the backend (see doc comment above). To drop this: make `fetch` a required arg of createModel/createEmbeddingModel and delete the fallback, so standalone callers always supply their own transport
	const { ProxyAgent } = require('undici') as typeof Undici;
	const dispatcher = new ProxyAgent(proxyUrl);
	return async (url, init) =>
		await globalThis.fetch(url, {
			...init,
			// @ts-expect-error dispatcher is a valid undici option for Node.js fetch
			dispatcher,
		});
}

type EntryBuilder<P extends ProviderId> = (
	creds: ProviderCredentials<P>,
	modelName: string,
	fetch: FetchFn | undefined,
) => LanguageModel;

type RegistryEntry<P extends ProviderId = ProviderId> = {
	build: EntryBuilder<P>;
	toolDeferral?: NativeToolDeferral;
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
 * Azure OpenAI scope for Entra Bearer auth. Mirrors the LangChain Azure node's
 * `AZURE_OPENAI_SCOPE` and the `resource` claim the reference impl sends in the
 * client-credentials token request.
 */
const AZURE_OPENAI_ENTRA_RESOURCE = 'https://cognitiveservices.azure.com/';

/**
 * Builds a `() => Promise<string>` bearer-token provider for an Azure Entra
 * OAuth2 credential. Ports `N8nOAuth2TokenCredential.getToken` from the
 * LangChain Azure node: mints a fresh token on every call via
 * `@n8n/client-oauth2`'s client-credentials flow, gated on a stored
 * `oauthTokenData.access_token` (proof the credential was connected).
 *
 * `@ai-sdk/azure`'s `createAzure` accepts this shape directly as `tokenProvider`;
 * it must not be paired with `apiKey`.
 */
function createEntraTokenProvider(
	creds: {
		oauthClientId?: string;
		oauthClientSecret?: string;
		oauthAccessTokenUrl?: string;
		oauthScope?: string;
		oauthAuthentication?: 'body' | 'header';
		oauthTokenData?: { access_token: string } & Record<string, unknown>;
	},
	options: { resource?: string; ssrfBridge?: ClientOAuth2Options['ssrfBridge'] } = {},
): () => Promise<string> {
	const {
		oauthClientId,
		oauthClientSecret,
		oauthAccessTokenUrl,
		oauthScope,
		oauthAuthentication,
		oauthTokenData,
	} = creds;
	return async () => {
		if (!oauthTokenData?.access_token) {
			throw new Error('Azure Entra OAuth2 credential is not connected');
		}
		if (!oauthClientId || !oauthAccessTokenUrl) {
			throw new Error('Azure Entra OAuth2 credential is missing clientId or accessTokenUrl');
		}
		const { ClientOAuth2 } = require('@n8n/client-oauth2') as typeof import('@n8n/client-oauth2');
		const client = new ClientOAuth2({
			clientId: oauthClientId,
			clientSecret: oauthClientSecret,
			accessTokenUri: oauthAccessTokenUrl,
			scopes: oauthScope?.split(' '),
			authentication: oauthAuthentication,
			additionalBodyProperties: { resource: options.resource ?? AZURE_OPENAI_ENTRA_RESOURCE },
			ssrfBridge: options.ssrfBridge,
		});
		const token = await client.credentials.getToken();
		return (token.data as { access_token: string }).access_token;
	};
}

/**
 * Mints an Entra ID token for the Foundry deployments-list call from a mapped
 * `azure-openai` credential. The token URL is stored on the credential, so the
 * caller passes the instance's SSRF bridge.
 */
export async function mintAzureFoundryDeploymentsToken(
	creds: Record<string, unknown>,
	ssrfBridge?: ClientOAuth2Options['ssrfBridge'],
): Promise<string> {
	const parsed = PROVIDER_CREDENTIAL_SCHEMAS['azure-openai'].parse(creds);
	return await createEntraTokenProvider(parsed, {
		resource: `${AZURE_AI_FOUNDRY_AUDIENCE}/`,
		ssrfBridge,
	})();
}

/**
 * Wraps a `fetch` so each request carries an `Authorization: Bearer <token>`
 * header resolved from a token provider. Used for Foundry Entra, where
 * `buildOpenAiCompatible` has no `tokenProvider` slot.
 */
function withBearerAuth(fetch: FetchFn | undefined, tokenProvider: () => Promise<string>): FetchFn {
	const base = fetch ?? globalFetch;
	return async (input, init) => {
		const token = await tokenProvider();
		const headers = new Headers(init?.headers);
		headers.set('Authorization', `Bearer ${token}`);
		return await base(input, { ...init, headers });
	};
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

export function isOfficialOpenAiBaseUrl(baseURL: string | undefined): boolean {
	return baseURL?.replace(/\/+$/, '') === 'https://api.openai.com/v1';
}

/** Whether a model accepts the stable and volatile prompt sections as separate system messages. */
export function supportsSplitSystemMessages(model: ModelConfig): boolean {
	const modelId = getModelIdString(model);
	if (isAnthropicMessagesProvider(modelId)) return true;
	switch (modelId.split('/')[0]) {
		case 'openrouter':
			return true;
		case 'openai': {
			if (typeof model === 'string') return true;
			const baseURL =
				'baseURL' in model && typeof model.baseURL === 'string'
					? model.baseURL
					: 'url' in model && typeof model.url === 'string'
						? model.url
						: undefined;
			return !baseURL || isOfficialOpenAiBaseUrl(baseURL);
		}
		default:
			return false;
	}
}

/**
 * Microsoft Foundry exposes an OpenAI-compatible `/openai/v1` base on
 * `*.services.ai.azure.com`. `@ai-sdk/azure`'s URL builder assumes the classic
 * `*.openai.azure.com` shape (it appends `/openai` and injects
 * `/deployments/{id}`), which mangles the Foundry URL into `…/openai/v1/openai`.
 * Drive it as a plain OpenAI-compatible endpoint so the configured base is used
 * verbatim. The model id is the deployment name, which Foundry matches against.
 */
function buildAzureFoundryModel(
	creds: ProviderCredentials<'azure-openai'>,
	model: string,
	fetch: FetchFn | undefined,
): LanguageModel {
	const { baseURL, apiKey, catalogModelId } = creds;
	// Neither SDK takes a token provider, so Entra ID wraps the transport to
	// send a fresh `Authorization: Bearer <token>` on every request.
	const isEntra = isAzureEntraCredential(creds);
	const transport = isEntra
		? withBearerAuth(fetch, createEntraTokenProvider(creds, { ssrfBridge: creds.ssrfBridge }))
		: fetch;

	if (model.startsWith(AZURE_FOUNDRY_ANTHROPIC_PREFIX)) {
		return buildAzureFoundryAnthropicModel(baseURL, isEntra ? undefined : apiKey, transport, {
			deployment: model.slice(AZURE_FOUNDRY_ANTHROPIC_PREFIX.length),
			servedModel: catalogModelId ? splitModelId(catalogModelId).model : undefined,
		});
	}
	return buildOpenAiCompatible(
		'azure-openai',
		undefined,
		isEntra ? { baseURL } : { apiKey, baseURL },
		model,
		transport,
	);
}

/**
 * Claude on Foundry answers on `<resource origin>/anthropic`; the SDK appends
 * `/messages` to the versioned base. The SDK reads output limits, structured
 * output and thinking support from the model id, so it gets the served model
 * when known, and the request still names the deployment.
 */
function buildAzureFoundryAnthropicModel(
	baseURL: string | undefined,
	apiKey: string | undefined,
	transport: FetchFn | undefined,
	{ deployment, servedModel }: { deployment: string; servedModel?: string },
): LanguageModel {
	if (!baseURL) throw new Error('baseURL is required for a Microsoft Foundry credential');
	const { createAnthropic } = require('@ai-sdk/anthropic') as typeof import('@ai-sdk/anthropic');
	return createAnthropic({
		baseURL: `${getAzureFoundryOrigin(baseURL)}/anthropic/v1`,
		// Without an API key the SDK needs some credential. The placeholder bearer
		// token also keeps it from reading ANTHROPIC_API_KEY off the host; the Entra
		// transport replaces it on every request.
		...(apiKey ? { apiKey } : { authToken: 'entra-id' }),
		fetch: servedModel ? withRequestModel(transport, deployment) : transport,
	})(servedModel ?? deployment);
}

/** Wraps a `fetch` so each JSON request body names `model` instead of the SDK's model id. */
function withRequestModel(fetch: FetchFn | undefined, model: string): FetchFn {
	const base = fetch ?? globalFetch;
	return async (input, init) => {
		if (typeof init?.body !== 'string') return await base(input, init);
		const body: unknown = JSON.parse(init.body);
		if (!isRecord(body)) return await base(input, init);
		return await base(input, { ...init, body: JSON.stringify({ ...body, model }) });
	};
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
		toolDeferral: openAiToolDeferral,
		build: (creds, model, fetch) => {
			const { createOpenAI } = require('@ai-sdk/openai') as typeof import('@ai-sdk/openai');
			const { apiStyle, ...providerCreds } = creds;
			const { baseURL } = providerCreds;
			// The official API serves /responses, which the provider's default model
			// targets. OpenAI credentials also carry that base URL. `isOpenAiCustomEndpoint`
			// reads the model-discovery host list, so a host added there to fix a model
			// dropdown also stops this endpoint from being probed.
			if (baseURL === undefined || !isOpenAiCustomEndpoint(baseURL)) {
				const provider = createOpenAI({ ...providerCreds, fetch });
				return apiStyle === 'chat' ? provider.chat(model) : provider(model);
			}
			// A custom baseURL can sit behind a reverse proxy whose catch-all answers
			// 200 with an HTML page, which the SDK stream parser accepts as an empty
			// stream. Every route through such an endpoint runs on the guarded
			// transport, whichever API the user pinned.
			const guarded = createOpenAI({
				...providerCreds,
				fetch: guardOpenAiRoutes(fetch ?? globalFetch),
			});
			// `apiStyle` is the explicit override and wins over the automatic choice:
			// it pins the route, so a refusal on it surfaces instead of falling back.
			if (apiStyle === 'chat') return guarded.chat(model);
			if (apiStyle === 'responses') return guarded(model);
			// Without it, only the endpoint knows whether it is a proxy for real
			// OpenAI or an OpenAI-COMPATIBLE server, so both adapters share the
			// transport and the first answer decides.
			return withChatCompletionsFallback(
				(headers) => endpointRouteKey(baseURL, providerCreds, headers),
				guarded(model),
				guarded.chat(model),
			);
		},
	},
	custom: {
		build: (creds, model, fetch) =>
			buildOpenAiCompatible('custom', undefined, creds, model, fetch, {
				supportsStructuredOutputs: creds.supportsStructuredOutputs,
			}),
	},
	anthropic: {
		toolDeferral: anthropicToolDeferral,
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
			// The SDK expects a version-qualified base (its own default ends in
			// `/v1beta`), but `googlePalmApi.host` stores the bare host — the Gemini
			// node's SDK appends the API version itself. Passing the host through
			// unqualified drops the version from every request path, and Google
			// answers 404 for any model.
			const normalizedBaseURL = creds.baseURL
				? ensureUrlPathSuffix(creds.baseURL, '/v1beta')
				: creds.baseURL;
			return createGoogle({ ...creds, baseURL: normalizedBaseURL, fetch })(model);
		},
	},
	'google-vertex': {
		build: createGoogleVertexModel,
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
			return wrapOpenRouterModel(
				createOpenRouter({ apiKey: creds.apiKey, baseURL: creds.baseURL, fetch })(model),
			);
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
			const { baseURL, resourceName, apiVersion, apiKey, endpointType } = creds;
			const isEntra = isAzureEntraCredential(creds);

			if (endpointType === 'foundry') return buildAzureFoundryModel(creds, model, fetch);
			if (model.startsWith(AZURE_FOUNDRY_ANTHROPIC_PREFIX)) {
				throw new Error('Claude deployments need a Microsoft Foundry credential');
			}

			// Classic Azure OpenAI (`*.openai.azure.com`, or `resourceName` only).
			// Use chat completions over deployment-based URLs so the credential's
			// date-based `apiVersion` (e.g. `2025-03-01-preview`) matches the URL
			// scheme Azure expects — mirroring the LangChain Azure node, which
			// forces `useResponsesApi: false`. The SDK's default `provider(model)`
			// selects the Responses API + the `/v1/` path, which Azure rejects with
			// "API version not supported" for date-based versions.
			//
			// Agents no longer accept new Classic credentials, but published agents
			// keep running: the model id is used as the deployment name.
			const { createAzure } = require('@ai-sdk/azure') as typeof import('@ai-sdk/azure');
			let normalizedBaseURL = baseURL;
			// SDK expects url like `https://resourceName.openai.azure.com/openai`
			if (normalizedBaseURL) {
				const url = new URL(normalizedBaseURL);
				if (!url.pathname.endsWith('/openai')) {
					url.pathname = url.pathname.replace(/\/?$/, '/openai');
					normalizedBaseURL = url.toString();
				}
			}
			// `@ai-sdk/azure` rejects `apiKey + tokenProvider` together, so pass
			// exactly one. Entra mints a Bearer via the token provider; apiKey
			// drives the `api-key` header path.
			const auth = isEntra
				? { tokenProvider: createEntraTokenProvider(creds, { ssrfBridge: creds.ssrfBridge }) }
				: { apiKey };
			return createAzure({
				resourceName,
				baseURL: normalizedBaseURL,
				apiVersion,
				useDeploymentBasedUrls: true,
				fetch,
				...auth,
			}).chat(model);
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

export function resolveNativeToolDeferral(config: ModelConfig): NativeToolDeferral | undefined {
	// A pre-built model does not expose its endpoint.
	if (isLanguageModel(config)) return undefined;
	const { provider, model } = splitModelId(getModelIdString(config));
	const entry = Object.entries(LANGUAGE_PROVIDERS).find(([id]) => id === provider)?.[1];
	const implementation = entry?.toolDeferral;
	if (!implementation?.supports(model, config)) return undefined;
	return implementation;
}

/**
 * Provider packages are loaded dynamically via require() so only the
 * provider needed at runtime must be installed.
 */
export function createModel(
	config: ModelConfig,
	fetch?: FetchFn,
	telemetry?: BuiltTelemetry,
): LanguageModel {
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
		const { id: _id, ...rest } = config;
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
	const transport = fetch ?? getProxyFetch();
	const resolvedFetch = telemetry?.traceModelRequests
		? traceModelRequests(transport ?? globalFetch, telemetry, provider, modelName)
		: transport;
	// Type cast: the registry guarantees the schema and builder are aligned per provider.
	return (entry.build as EntryBuilder<typeof provider>)(parsed.data, modelName, resolvedFetch);
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
