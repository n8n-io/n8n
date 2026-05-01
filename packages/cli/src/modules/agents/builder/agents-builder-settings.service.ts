import { proxyFetch } from '@n8n/ai-utilities';
import {
	AGENT_BUILDER_DEFAULT_MODEL,
	agentBuilderAdminSettingsSchema,
	type AgentBuilderAdminSettings,
	type AgentBuilderAdminSettingsResponse,
	type AgentBuilderAdminSettingsUpdateRequest,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { ModelConfig, ResolvedCredential } from '@n8n/agents';
import type { User } from '@n8n/db';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';

import {
	isSupportedAgentProvider,
	mapCredentialForProvider,
	SUPPORTED_AGENT_PROVIDERS,
} from '../json-config/credential-field-mapping';
import { BuilderNotConfiguredError } from './errors';

const SETTINGS_KEY = 'agentBuilder.settings';

const DEFAULT_SETTINGS: AgentBuilderAdminSettings = { mode: 'default' };

const PROXY_HEADERS = {
	'x-n8n-feature': 'agent-builder',
};

/** Read an Anthropic key from env, preferring the n8n-specific variable. */
function readEnvAnthropicKey(): string | null {
	const key = process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
	return key && key.length > 0 ? key : null;
}

/**
 * Admin-instance-wide settings for the agent builder. Decides which model
 * the builder LLM runs on:
 *   1. `mode: 'custom'` — admin-picked credential. Wins regardless of platform.
 *   2. `mode: 'default'` + AI proxy enabled — runs through the n8n AI assistant proxy.
 *   3. `mode: 'default'` + env-var backstop set (`N8N_AI_ANTHROPIC_KEY` /
 *      `ANTHROPIC_API_KEY`) — direct Anthropic API calls.
 */
@Service()
export class AgentsBuilderSettingsService {
	/** In-memory cache of the persisted settings. */
	private cached: AgentBuilderAdminSettings | null = null;

	constructor(
		private readonly logger: Logger,
		private readonly settingsRepository: SettingsRepository,
		private readonly aiService: AiService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	/** Load and cache the persisted admin settings (defaults to `{ mode: 'default' }`). */
	private async loadSettings(): Promise<AgentBuilderAdminSettings> {
		if (this.cached) return this.cached;
		const row = await this.settingsRepository.findByKey(SETTINGS_KEY);
		if (!row) {
			this.cached = DEFAULT_SETTINGS;
			return this.cached;
		}
		// Tolerate corrupt persisted JSON or stale shapes by falling back to
		// defaults — the admin can re-save from the UI to recover.
		const raw = jsonParse<unknown>(row.value, { fallbackValue: undefined });
		const parseResult = agentBuilderAdminSettingsSchema.safeParse(raw);
		this.cached = parseResult.success ? parseResult.data : DEFAULT_SETTINGS;
		return this.cached;
	}

	private async persist(settings: AgentBuilderAdminSettings): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: SETTINGS_KEY,
				value: JSON.stringify(settings),
				loadOnStartup: true,
			},
			['key'],
		);
		this.cached = settings;
	}

	/** Get the persisted admin settings + the derived `isConfigured` flag. */
	async getAdminSettings(): Promise<AgentBuilderAdminSettingsResponse> {
		const settings = await this.loadSettings();
		const isConfigured = await this.computeIsConfigured(settings);
		return { settings, isConfigured };
	}

	/** Lightweight readiness check used by the builder UI to gate the input box. */
	async getStatus(): Promise<{ isConfigured: boolean }> {
		const settings = await this.loadSettings();
		const isConfigured = await this.computeIsConfigured(settings);
		return { isConfigured };
	}

	private async computeIsConfigured(settings: AgentBuilderAdminSettings): Promise<boolean> {
		if (settings.mode === 'custom') {
			const credential = await this.credentialsFinderService.findCredentialById(
				settings.credentialId,
			);
			return !!credential;
		}
		// mode === 'default' — true if any of the runtime resolution branches
		// can succeed: AI proxy enabled, or the env-var backstop is set.
		return this.aiService.isProxyEnabled() || !!readEnvAnthropicKey();
	}

	/**
	 * Update and persist the admin settings.
	 *
	 * The shape of `payload` is already enforced by the controller via the
	 * shared `AgentBuilderAdminSettingsUpdateDto` Zod schema. The only
	 * additional check needed here is the runtime constraint that `provider`
	 * must be one the agents runtime can actually map a credential for —
	 * something the api-types schema deliberately doesn't encode.
	 */
	async updateAdminSettings(payload: AgentBuilderAdminSettingsUpdateRequest): Promise<void> {
		if (payload.mode === 'custom' && !isSupportedAgentProvider(payload.provider)) {
			throw new UnprocessableRequestError(
				`Unsupported provider "${payload.provider}". Supported: ${SUPPORTED_AGENT_PROVIDERS.join(', ')}`,
			);
		}
		await this.persist(payload);
	}

	/**
	 * Resolve the `ModelConfig` the builder agent should run on.
	 *
	 * Priority:
	 *   1. mode 'custom' with a still-resolvable credential
	 *   2. mode 'default' + AI proxy enabled
	 *   3. env-var backstop (dev/CI only)
	 *
	 * Throws `BuilderNotConfiguredError` when none resolve.
	 */
	async resolveModelConfig(user: User): Promise<{ config: ModelConfig; isProxied: boolean }> {
		const settings = await this.loadSettings();

		if (settings.mode === 'custom') {
			const fromCredential = await this.tryResolveCustomCredential(settings);
			if (fromCredential) return { config: fromCredential, isProxied: false };
			this.logger.warn(
				'Agent builder custom credential could not be resolved; falling back to default',
				{ credentialId: settings.credentialId },
			);
		}

		if (this.aiService.isProxyEnabled()) {
			return { config: await this.resolveProxyModel(user), isProxied: true };
		}

		const envKey = readEnvAnthropicKey();
		if (envKey) {
			return {
				config: {
					id: `anthropic/${AGENT_BUILDER_DEFAULT_MODEL}`,
					apiKey: envKey,
				},
				isProxied: false,
			};
		}

		throw new BuilderNotConfiguredError();
	}

	private async tryResolveCustomCredential(
		settings: Extract<AgentBuilderAdminSettings, { mode: 'custom' }>,
	): Promise<ModelConfig | null> {
		if (!isSupportedAgentProvider(settings.provider)) {
			this.logger.warn('Agent builder provider is not supported by the runtime', {
				provider: settings.provider,
				credentialId: settings.credentialId,
			});
			return null;
		}

		const credential = await this.credentialsFinderService.findCredentialById(
			settings.credentialId,
		);
		if (!credential) return null;

		const data = await this.credentialsService.decrypt(credential, true);
		// Reuse the shared credential mapper used by the agent runtime
		// (`from-json-config.ts`). It normalises field names per provider so
		// Azure OpenAI, AWS Bedrock, OpenAI-compatible base URLs, etc. all work.
		const mapped = mapCredentialForProvider(settings.provider, data as ResolvedCredential);

		const id = `${settings.provider}/${settings.modelName}`;
		return { id, ...mapped } as ModelConfig;
	}

	/**
	 * Build a native Anthropic `LanguageModel` pointed at the proxy. Auth
	 * headers are injected via a `fetch` wrapper backed by `ProxyTokenManager`
	 * so each request gets a fresh-or-cached token.
	 */
	private async resolveProxyModel(user: User): Promise<ModelConfig> {
		const client = await this.aiService.getClient();
		const baseURL = client.getApiProxyBaseUrl().replace(/\/$/, '') + '/anthropic/v1';

		const tokenManager = new ProxyTokenManager(async () => {
			return await client.getBuilderApiProxyToken({ id: user.id }, { userMessageId: nanoid() });
		});

		const { createAnthropic } = await import('@ai-sdk/anthropic');

		const provider = createAnthropic({
			baseURL,
			apiKey: 'proxy-managed',
			fetch: async (input, init) => {
				const headers = new Headers(init?.headers);
				const auth = await tokenManager.getAuthHeaders();
				for (const [k, v] of Object.entries(auth)) {
					headers.set(k, v);
				}
				for (const [k, v] of Object.entries(PROXY_HEADERS)) {
					headers.set(k, v);
				}
				return await proxyFetch(input as string, { ...init, headers });
			},
		});
		const model = provider(AGENT_BUILDER_DEFAULT_MODEL);
		// `LanguageModel` from the AI SDK is structurally compatible with ModelConfig.
		if (!model) {
			throw new UnexpectedError('Failed to instantiate Anthropic proxy model');
		}
		return model as ModelConfig;
	}
}
