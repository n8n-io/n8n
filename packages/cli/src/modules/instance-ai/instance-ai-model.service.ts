import { UNLIMITED_CREDITS, buildProxyHeaders } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ModelConfig } from '@n8n/instance-ai';
import { nanoid } from 'nanoid';
import type * as Undici from 'undici';

import { N8N_VERSION } from '@/constants';
import { Push } from '@/push';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';

import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiThreadRepository } from './repositories/instance-ai-thread.repository';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * When HTTP_PROXY / HTTPS_PROXY is set (e.g. in e2e tests with MockServer),
 * return a fetch function that routes requests through the proxy. Node.js's
 * globalThis.fetch does not respect these env vars, so AI SDK providers would
 * bypass the proxy without this.
 */
function getProxyFetch(): typeof globalThis.fetch | undefined {
	const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
	if (!proxyUrl) return undefined;

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { ProxyAgent } = require('undici') as typeof Undici;
	const dispatcher = new ProxyAgent(proxyUrl);
	return (async (url: string | URL | Request, init?: RequestInit) =>
		await globalThis.fetch(url, {
			...init,
			// @ts-expect-error dispatcher is a valid undici option for Node.js fetch
			dispatcher,
		})) as typeof globalThis.fetch;
}

/**
 * Resolves the language model the Instance AI agent runs against and accounts
 * for the credits a run consumes.
 *
 * Model resolution follows a layered chain so chat and eval paths share the
 * same working model:
 *   1. AI service proxy (when enabled) — wraps with proxy auth, returns a
 *      native Anthropic transport pointed at the proxy.
 *   2. HTTP_PROXY (when set, e.g. e2e tests) — wraps the model with a
 *      proxy-aware fetch.
 *   3. Env vars / user credential — raw settings resolution.
 *
 * Credit accounting counts one credit for the first completed orchestrator run
 * in a thread; later messages in the same thread are free. An in-memory guard
 * plus DB metadata keep the count idempotent across concurrent calls and
 * process restarts.
 */
@Service()
export class InstanceAiModelService {
	private readonly logger: Logger;

	/** In-memory guard to prevent double credit counting within the same process. */
	private readonly creditedThreads = new Set<string>();

	constructor(
		logger: Logger,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly aiService: AiService,
		private readonly push: Push,
		private readonly threadRepo: InstanceAiThreadRepository,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/** Whether the AI service proxy is enabled for credit counting. */
	isProxyEnabled(): boolean {
		return this.aiService.isProxyEnabled();
	}

	/** Forget any per-thread credit state once a thread is torn down. */
	clearThread(threadId: string): void {
		this.creditedThreads.delete(threadId);
	}

	/**
	 * Fetch a fresh proxy auth token and return the client + Authorization headers.
	 * Each caller gets a unique token (separate nanoid) for audit tracking.
	 */
	private async getProxyAuth(user: User) {
		const client = await this.aiService.getClient();
		const token = await client.getBuilderApiProxyToken(
			{ id: user.id },
			{ userMessageId: nanoid() },
		);
		return {
			client,
			headers: { Authorization: `${token.tokenType} ${token.accessToken}` },
		};
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
				return await globalThis.fetch(input, { ...init, headers });
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
		const proxyFetch = getProxyFetch();
		if (!proxyFetch) return undefined;

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
			fetch: proxyFetch,
		})(modelName);
	}

	/**
	 * Count one credit for the first completed orchestrator run in a thread.
	 * Subsequent messages in the same thread are free.
	 *
	 * Race-condition mitigation strategy:
	 * - In-memory Set (`creditedThreads`) prevents concurrent calls within
	 *   the same process from both passing the check.
	 * - DB metadata (`creditCounted: true`) survives process restarts.
	 * - markBuilderSuccess is idempotent on the proxy side, so a theoretical
	 *   double-count after a crash mid-save is harmless.
	 */
	async countCreditsIfFirst(user: User, threadId: string, runId: string): Promise<void> {
		if (!this.aiService.isProxyEnabled()) return;

		// Fast in-memory check — prevents the read-then-write race within a single process.
		if (this.creditedThreads.has(threadId)) return;

		let thread: Awaited<ReturnType<InstanceAiThreadRepository['findOneBy']>>;
		try {
			thread = await this.threadRepo.findOneBy({ id: threadId });
		} catch (error) {
			this.logger.warn('Failed to check Instance AI credit status', {
				threadId,
				runId,
				error: getErrorMessage(error),
			});
			return;
		}
		if (!thread) return;
		if (thread.metadata?.creditCounted) {
			this.creditedThreads.add(threadId); // Sync in-memory with DB state
			return;
		}

		try {
			this.creditedThreads.add(threadId); // Claim before async work
			const { client, headers: authHeaders } = await this.getProxyAuth(user);
			const info = await client.markBuilderSuccess({ id: user.id }, authHeaders);
			if (info) {
				thread.metadata = { ...thread.metadata, creditCounted: true };
				await this.threadRepo.save(thread);
				this.push.sendToUsers(
					{
						type: 'updateInstanceAiCredits',
						data: { creditsQuota: info.creditsQuota, creditsClaimed: info.creditsClaimed },
					},
					[user.id],
				);
			}
		} catch (error) {
			this.creditedThreads.delete(threadId); // Allow retry on failure
			this.logger.warn('Failed to count Instance AI credits', {
				error: getErrorMessage(error),
				threadId,
				runId,
			});
		}
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
