import { UNLIMITED_CREDITS, buildProxyHeaders, type InstanceAiCredits } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ModelConfig } from '@n8n/instance-ai';
import { nanoid } from 'nanoid';

import { N8N_VERSION } from '@/constants';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';
import { callAiServiceWithRetry } from '@/utils/ai-service-retry';

import { InstanceAiSettingsService } from './instance-ai-settings.service';

/**
 * Bare model name used for workflow-overview generation when no
 * `N8N_INSTANCE_AI_OVERVIEW_MODEL` override is set and the main model is
 * Anthropic. Overviews are three schema-bound sentences — a smaller model is
 * indistinguishable in quality and much cheaper, and the sidecar runs on
 * every user turn.
 */
const DEFAULT_ANTHROPIC_OVERVIEW_MODEL = 'claude-sonnet-4-6';

/**
 * Resolves the language model the Instance AI agent runs against and reports
 * the credit balance for the current user.
 *
 * Model resolution follows a layered chain so chat and eval paths share the
 * same working model:
 *   1. AI service proxy (when enabled) — wraps with proxy auth, returns a
 *      native Anthropic transport pointed at the proxy.
 *   2. HTTP_PROXY (when set, e.g. e2e tests) — wraps the model with a
 *      proxy-aware fetch.
 *   3. Env vars / user credential — raw settings resolution.
 *
 * Credit *accounting* (claiming token usage per run) lives in
 * `InstanceAiCreditService.claimRunUsage`; this service only exposes the
 * read-only balance via `getCredits`.
 */
@Service()
export class InstanceAiModelService {
	constructor(
		private readonly settingsService: InstanceAiSettingsService,
		private readonly aiService: AiService,
		private readonly outboundHttp: OutboundHttp,
		private readonly globalConfig: GlobalConfig,
	) {}

	/** Whether the AI service proxy is enabled for credit counting. */
	isProxyEnabled(): boolean {
		return this.aiService.isProxyEnabled();
	}

	/**
	 * Full model-resolver chain shared between chat and eval paths.
	 *
	 * Mirrors the resolution used in the run setup:
	 *   1. AI service proxy (when enabled) — wraps with proxy auth.
	 *   2. HTTP_PROXY (when set, e.g. e2e tests) — wraps with proxy fetch.
	 *   3. Env vars / user credential — raw settings resolution.
	 *
	 * Call this instead of `settingsService.resolveModelConfig` directly so
	 * the eval endpoint gets the same working model the chat endpoint uses.
	 */
	async resolveAgentModelConfig(user: User): Promise<ModelConfig> {
		if (this.aiService.isProxyEnabled()) {
			const client = await this.aiService.getClient();
			const proxyBaseUrl = client.getApiProxyBaseUrl();
			const tokenManager = new ProxyTokenManager(async () => {
				return await client.getInstanceAiApiProxyToken(
					{ id: user.id },
					{ userMessageId: nanoid() },
				);
			});
			return await this.resolveProxyModel(user, proxyBaseUrl, tokenManager);
		}
		const httpProxyModel = await this.resolveHttpProxyModel(user);
		if (httpProxyModel) return httpProxyModel;
		return await this.settingsService.resolveModelConfig(user);
	}

	/**
	 * Model for lightweight workflow-overview generation (three schema-bound
	 * sentences): `N8N_INSTANCE_AI_OVERVIEW_MODEL` when set (bare model name,
	 * inherits the main model's provider + credentials), otherwise a smaller
	 * Anthropic default when the main model is Anthropic, otherwise the main
	 * agent model. Follows the same proxy resolution chain as
	 * {@link resolveAgentModelConfig}.
	 */
	async resolveOverviewModelConfig(user: User): Promise<ModelConfig> {
		const override = this.globalConfig.instanceAi.overviewModel.trim();
		const hasOverride = override !== '';
		const overrideOrDefault = hasOverride ? override : DEFAULT_ANTHROPIC_OVERVIEW_MODEL;

		if (this.aiService.isProxyEnabled()) {
			const client = await this.aiService.getClient();
			const proxyBaseUrl = client.getApiProxyBaseUrl();
			const tokenManager = new ProxyTokenManager(async () => {
				return await client.getInstanceAiApiProxyToken(
					{ id: user.id },
					{ userMessageId: nanoid() },
				);
			});
			// The proxy transport is Anthropic-native, so the smaller default is safe here.
			return await this.resolveProxyModel(user, proxyBaseUrl, tokenManager, {
				modelNameOverride: overrideOrDefault,
			});
		}

		// The HTTP-proxy path only ever builds Anthropic models (see the provider gate).
		const httpProxyModel = await this.resolveHttpProxyModel(user, {
			modelNameOverride: overrideOrDefault,
		});
		if (httpProxyModel) return httpProxyModel;

		if (hasOverride) {
			return await this.settingsService.resolveModelConfigForVerification(user, override);
		}
		if (await this.isMainModelAnthropic(user)) {
			return await this.settingsService.resolveModelConfigForVerification(
				user,
				DEFAULT_ANTHROPIC_OVERVIEW_MODEL,
			);
		}
		return await this.settingsService.resolveModelConfig(user);
	}

	/** Whether the resolved main model belongs to the Anthropic provider. */
	private async isMainModelAnthropic(user: User): Promise<boolean> {
		const config = await this.settingsService.resolveModelConfig(user);
		const modelId = typeof config === 'string' ? config : 'id' in config ? config.id : null;
		return typeof modelId === 'string' && modelId.startsWith('anthropic/');
	}

	/**
	 * Build model config. When the AI service proxy is enabled, returns a native
	 * Anthropic LanguageModelV2 instance pointing at the proxy.
	 *
	 * We use `@ai-sdk/anthropic` directly instead of returning a `{ url }` config
	 * object because this proxy route needs the native Anthropic transport.
	 * The proxy may forward to Vertex AI, which only supports the native Anthropic
	 * Messages API (`/v1/messages`), not the OpenAI-compatible endpoint.
	 *
	 * Auth headers are injected via a custom `fetch` wrapper so that each
	 * request gets a fresh-or-cached token from the ProxyTokenManager,
	 * avoiding 401s on long-running agent turns.
	 */
	async resolveProxyModel(
		user: User,
		proxyBaseUrl: string,
		tokenManager: ProxyTokenManager,
		options?: { modelNameOverride?: string },
	): Promise<ModelConfig> {
		const modelName = options?.modelNameOverride ?? this.settingsService.resolveModelName(user);
		const { createAnthropic } = await import('@ai-sdk/anthropic');
		// Route through the proxy-aware transport so this path honours
		// HTTP(S)_PROXY and the long AI timeout, same as the HTTP-proxy path.
		const modelFetch = createAiProxyFetch(this.outboundHttp);
		const provider = createAnthropic({
			baseURL: proxyBaseUrl + '/anthropic/v1',
			apiKey: 'proxy-managed',
			fetch: async (input, init) => {
				const headers = new Headers(init?.headers);
				const auth = await tokenManager.getAuthHeaders();
				for (const [k, v] of Object.entries(auth)) {
					headers.set(k, v);
				}
				for (const [k, v] of Object.entries(
					buildProxyHeaders({ feature: 'instance-ai', n8nVersion: N8N_VERSION }),
				)) {
					headers.set(k, v);
				}
				return await modelFetch(input, { ...init, headers });
			},
		});
		return provider(modelName);
	}

	/**
	 * When HTTP_PROXY is set (e.g. e2e tests with MockServer), build the model
	 * with a proxy-aware fetch so the AI SDK routes through the proxy.
	 * Returns undefined if no HTTP_PROXY is set or the model isn't anthropic.
	 */
	private async resolveHttpProxyModel(
		user: User,
		options?: { modelNameOverride?: string },
	): Promise<ModelConfig | undefined> {
		// Only take over model construction when a proxy is configured; otherwise
		// the regular model resolution path applies. Node's global `fetch` does
		// not honour HTTP(S)_PROXY, hence the proxy-aware transport below.
		const hasHttpProxy = Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
		if (!hasHttpProxy) return undefined;

		const config = await this.settingsService.resolveModelConfig(user);
		const modelId = typeof config === 'string' ? config : 'id' in config ? config.id : null;
		if (!modelId) return undefined;

		const [provider, ...rest] = modelId.split('/');
		const modelName = options?.modelNameOverride ?? rest.join('/');
		const apiKey = typeof config === 'object' && 'apiKey' in config ? config.apiKey : undefined;
		const baseURL = typeof config === 'object' && 'url' in config ? config.url : undefined;
		if (provider !== 'anthropic') return undefined;

		const { createAnthropic } = await import('@ai-sdk/anthropic');
		return createAnthropic({
			apiKey,
			baseURL: baseURL || undefined,
			fetch: createAiProxyFetch(this.outboundHttp),
		})(modelName);
	}

	/** Get current Instance AI credit usage from the AI service proxy. */
	async getCredits(user: User): Promise<InstanceAiCredits> {
		if (!this.aiService.isProxyEnabled()) {
			return { creditsQuota: UNLIMITED_CREDITS, creditsClaimed: 0 };
		}
		const client = await this.aiService.getClient();
		return await callAiServiceWithRetry(
			'Instance AI credits fetch',
			async () => await client.getInstanceAiCredits({ id: user.id }),
		);
	}
}
