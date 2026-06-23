import { UNLIMITED_CREDITS, buildProxyHeaders } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ModelConfig } from '@n8n/instance-ai';
import { nanoid } from 'nanoid';

import { N8N_VERSION } from '@/constants';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { InstanceAiSettingsService } from './instance-ai-settings.service';

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
				return await client.getBuilderApiProxyToken({ id: user.id }, { userMessageId: nanoid() });
			});
			return await this.resolveProxyModel(user, proxyBaseUrl, tokenManager);
		}
		const httpProxyModel = await this.resolveHttpProxyModel(user);
		if (httpProxyModel) return httpProxyModel;
		return await this.settingsService.resolveModelConfig(user);
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
	): Promise<ModelConfig> {
		const modelName = this.settingsService.resolveModelName(user);
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
	private async resolveHttpProxyModel(user: User): Promise<ModelConfig | undefined> {
		// Only take over model construction when a proxy is configured; otherwise
		// the regular model resolution path applies. Node's global `fetch` does
		// not honour HTTP(S)_PROXY, hence the proxy-aware transport below.
		const hasHttpProxy = Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
		if (!hasHttpProxy) return undefined;

		const config = await this.settingsService.resolveModelConfig(user);
		const modelId = typeof config === 'string' ? config : 'id' in config ? config.id : null;
		if (!modelId) return undefined;

		const [provider, ...rest] = modelId.split('/');
		const modelName = rest.join('/');
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

	/** Get current credit usage from the AI service proxy. */
	async getCredits(user: User): Promise<{ creditsQuota: number; creditsClaimed: number }> {
		if (!this.aiService.isProxyEnabled()) {
			return { creditsQuota: UNLIMITED_CREDITS, creditsClaimed: 0 };
		}
		const client = await this.aiService.getClient();
		return await client.getBuilderInstanceCredits({ id: user.id });
	}
}
