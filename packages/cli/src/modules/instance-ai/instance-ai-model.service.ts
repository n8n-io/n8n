import { splitModelId } from '@n8n/ai-utilities/agent-config';
import {
	UNLIMITED_CREDITS,
	isMoonshotaiKimiK3ModelId,
	type InstanceAiCredits,
	type ProxyContext,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ModelConfig } from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { nanoid } from 'nanoid';

import { N8N_VERSION } from '@/constants';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';
import { createProxyLanguageModel } from '@/utils/ai-proxy-language-model';
import { callAiServiceWithRetry } from '@/utils/ai-service-retry';

import { InstanceAiSettingsService } from './instance-ai-settings.service';

/**
 * Resolves the language model the Instance AI agent runs against and reports
 * the credit balance for the current user.
 *
 * Model resolution follows a layered chain so chat and eval paths share the
 * same working model:
 *   1. AI service proxy (when enabled) — wraps with proxy auth.
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
		private readonly logger: Logger,
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
	 *
	 * `proxyContext` is forwarded as `x-n8n-run-id` / `x-n8n-thread-id` on every
	 * proxied model call when set (run-less callers like verification omit it).
	 */
	async resolveAgentModelConfig(
		user: User,
		proxyContext?: ProxyContext,
		modelName?: string,
	): Promise<ModelConfig> {
		if (this.aiService.isProxyEnabled()) {
			const client = await this.aiService.getClient();
			const proxyBaseUrl = client.getApiProxyBaseUrl();
			const tokenManager = new ProxyTokenManager(async () => {
				return await client.getInstanceAiApiProxyToken(
					{ id: user.id },
					{ userMessageId: nanoid() },
				);
			});
			return await this.resolveProxyModel(
				user,
				proxyBaseUrl,
				tokenManager,
				proxyContext,
				modelName,
			);
		}
		const httpProxyModel = await this.resolveHttpProxyModel(user, modelName);
		if (httpProxyModel) return httpProxyModel;
		const config = await this.settingsService.resolveModelConfig(user);
		if (!modelName) return config;
		const renamed = withModelName(config, modelName);
		if (!renamed) {
			this.logger.warn('Instance AI model cannot switch model names, using the main model', {
				modelName,
			});
		}
		return renamed ?? config;
	}

	/**
	 * Model for the Observer and Reflector memory tasks. It runs the configured
	 * memory model name on the main model's provider and credentials, through
	 * the same resolver chain. Returns `undefined` when no memory model is set,
	 * so the caller uses the main model.
	 */
	async resolveMemoryModelConfig(
		user: User,
		run: { proxyBaseUrl?: string; tokenManager?: ProxyTokenManager; proxyContext?: ProxyContext },
	): Promise<ModelConfig | undefined> {
		const modelName = this.settingsService.getConfiguredMemoryModelName();
		if (!modelName) return undefined;
		try {
			return run.proxyBaseUrl && run.tokenManager
				? await this.resolveProxyModel(
						user,
						run.proxyBaseUrl,
						run.tokenManager,
						run.proxyContext,
						modelName,
					)
				: await this.resolveAgentModelConfig(user, run.proxyContext, modelName);
		} catch (error) {
			// A memory model must never fail the user's run; the main model still works.
			this.logger.warn('Failed to resolve the Instance AI memory model, using the main model', {
				modelName,
				error: getErrorMessage(error),
			});
			return undefined;
		}
	}

	/**
	 * Build model config. When the AI service proxy is enabled, returns a
	 * LanguageModel pointed at the proxy.
	 *
	 * Auth headers are injected via a custom `fetch` wrapper so that each
	 * request gets a fresh-or-cached token from the ProxyTokenManager,
	 * avoiding 401s on long-running agent turns.
	 */
	async resolveProxyModel(
		user: User,
		proxyBaseUrl: string,
		tokenManager: ProxyTokenManager,
		proxyContext?: ProxyContext,
		modelName?: string,
	): Promise<ModelConfig> {
		const configuredModelId = this.settingsService.getConfiguredModelId();
		const isExactKimi = isMoonshotaiKimiK3ModelId(configuredModelId);
		const modelId = modelName
			? isMoonshotaiKimiK3ModelId(modelName)
				? modelName
				: modelNameForProvider(modelName, splitModelId(configuredModelId).provider)
			: isExactKimi
				? configuredModelId
				: this.settingsService.resolveModelName(user);
		return await createProxyLanguageModel({
			proxyBaseUrl,
			modelId,
			tokenManager,
			feature: 'instance-ai',
			n8nVersion: N8N_VERSION,
			outboundHttp: this.outboundHttp,
			...proxyContext,
		});
	}

	/**
	 * When HTTP_PROXY is set (e.g. e2e tests with MockServer), build the model
	 * with a proxy-aware fetch so the AI SDK routes through the proxy.
	 * Returns undefined if no HTTP_PROXY is set or the model isn't anthropic.
	 */
	private async resolveHttpProxyModel(
		user: User,
		modelNameOverride?: string,
	): Promise<ModelConfig | undefined> {
		// Only take over model construction when a proxy is configured; otherwise
		// the regular model resolution path applies. Node's global `fetch` does
		// not honour HTTP(S)_PROXY, hence the proxy-aware transport below.
		const hasHttpProxy = Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
		if (!hasHttpProxy) return undefined;

		const config = await this.settingsService.resolveModelConfig(user);
		const modelId = typeof config === 'string' ? config : 'id' in config ? config.id : null;
		if (!modelId) return undefined;

		const { provider, model: modelName } = splitModelId(modelId);
		const apiKey = typeof config === 'object' && 'apiKey' in config ? config.apiKey : undefined;
		const baseURL = typeof config === 'object' && 'url' in config ? config.url : undefined;
		if (provider !== 'anthropic') return undefined;

		const { createAnthropic } = await import('@ai-sdk/anthropic');
		return createAnthropic({
			apiKey,
			baseURL: baseURL || undefined,
			fetch: createAiProxyFetch(this.outboundHttp),
		})(modelNameOverride ? modelNameForProvider(modelNameOverride, provider) : modelName);
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

/**
 * Replaces the model name in a `provider/model` config and keeps the provider
 * and credentials. Returns `undefined` for a config without such an id, for
 * example a pre-built language model.
 */
function withModelName(config: ModelConfig, modelName: string): ModelConfig | undefined {
	if (typeof config === 'string') {
		const { provider } = splitModelId(config);
		return provider ? `${provider}/${modelNameForProvider(modelName, provider)}` : undefined;
	}
	if ('project' in config) {
		const name = modelNameForProvider(modelName, 'google-vertex-anthropic');
		return { ...config, id: `google-vertex-anthropic/${name}` };
	}
	if ('url' in config) {
		const provider = splitModelId(config.id).provider || 'custom';
		return { ...config, id: `${provider}/${modelNameForProvider(modelName, provider)}` };
	}
	return undefined;
}

/**
 * Reads a memory model value like `N8N_INSTANCE_AI_MODEL`: a `provider/` prefix that
 * matches the main model's provider is dropped. Any other value is the provider's own
 * model name, for example `anthropic/claude-haiku-4.5` on OpenRouter.
 */
function modelNameForProvider(value: string, mainProvider: string): string {
	const { provider, model } = splitModelId(value);
	return provider && provider === mainProvider ? model : value;
}
