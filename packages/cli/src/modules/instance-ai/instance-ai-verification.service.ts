import type {
	InstanceAiConnectionUpdate,
	InstanceAiVerificationFailure,
	InstanceAiVerificationResponse,
	InstanceAiVerifyModelRequest,
	InstanceAiVerifySandboxRequest,
	InstanceAiVerifySearchRequest,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ModelConfig, SandboxConfig } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import { Telemetry } from '@/telemetry';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { InstanceAiModelService } from './instance-ai-model.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';

const VERIFICATION_TIMEOUT_MS = 30_000;

const MAX_ERROR_MESSAGE_LENGTH = 512;

/**
 * The probe only needs the call to succeed, not its text, but OpenAI's
 * Responses API rejects `max_output_tokens` below 16.
 */
const VERIFICATION_MAX_OUTPUT_TOKENS = 16;

/**
 * Providers can echo credentials back in error messages. Scrub known secret
 * shapes (API keys, bearer tokens, key=value pairs), drop URL query strings
 * (e.g. ?key=...), and cap the length.
 */
function sanitizeVerificationError(error: unknown): string {
	return scrubSecretsInText(ensureError(error).message)
		.replace(/(https?:\/\/[^\s?]+)\?\S*/g, '$1')
		.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function modelProviderOf(config: ModelConfig): string | null {
	if (typeof config === 'string') return config.split('/', 1)[0] || null;
	if (typeof config !== 'object') return null;
	if ('id' in config && typeof config.id === 'string') {
		return config.id.split('/', 1)[0] || null;
	}
	// Pre-built AI SDK LanguageModel instances carry `provider` like 'anthropic.messages'.
	if ('provider' in config && typeof config.provider === 'string') {
		return config.provider.split('.', 1)[0] || null;
	}
	return null;
}

function numericStatus(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	for (const key of ['status', 'statusCode', 'code']) {
		const value = Reflect.get(error, key);
		if (typeof value === 'number') return value;
		if (typeof value === 'string' && /^\d{3}$/.test(value)) return Number(value);
	}
	return undefined;
}

function classifyFailure(error: unknown): InstanceAiVerificationFailure {
	const status = numericStatus(error);
	if (status === 401) return 'unauthorized';
	if (status === 403) {
		const message = ensureError(error).message.toLowerCase();
		return message.includes('quota') || message.includes('limit') ? 'quota_exceeded' : 'forbidden';
	}
	if (status === 429) return 'rate_limited';

	const errorObject = ensureError(error);
	if (errorObject.name === 'AbortError' || errorObject.name === 'TimeoutError') return 'timeout';
	const message = errorObject.message.toLowerCase();
	if (/\b401\b/.test(message)) return 'unauthorized';
	if (/\b403\b/.test(message)) {
		return message.includes('quota') || message.includes('limit') ? 'quota_exceeded' : 'forbidden';
	}
	if (/\b429\b/.test(message)) return 'rate_limited';
	if (message.includes('timeout') || message.includes('timed out')) return 'timeout';
	if (
		message.includes('econnrefused') ||
		message.includes('enotfound') ||
		message.includes('fetch failed') ||
		message.includes('network')
	)
		return 'unreachable';
	if (message.includes('json') || message.includes('response')) return 'invalid_response';
	return 'provider_error';
}

function connectionString(
	connection: InstanceAiConnectionUpdate | undefined,
	field: string,
): string | undefined {
	const value = connection?.data[field];
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

@Service()
export class InstanceAiVerificationService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly modelService: InstanceAiModelService,
		private readonly outboundHttp: OutboundHttp,
		private readonly telemetry: Telemetry,
	) {}

	async verifyModel(
		user: User,
		request: InstanceAiVerifyModelRequest,
	): Promise<InstanceAiVerificationResponse> {
		let provider: string | null = null;
		try {
			const connection = request.connection
				? await this.settingsService.resolveModelConnectionForVerification(request.connection)
				: undefined;
			const modelConfig = connection
				? this.settingsService.buildModelConfigForConnection(connection, request.modelName ?? '')
				: request.modelName
					? await this.settingsService.resolveModelConfigForVerification(user, request.modelName)
					: await this.modelService.resolveAgentModelConfig(user);
			// Under the AI service proxy the resolved model is a pre-built LanguageModel
			// whose `provider` reflects the proxy transport, not the configured model —
			// attribute from the configured model id instead.
			provider =
				!connection && !request.modelName && this.settingsService.isProxyEnabled()
					? this.settingsService.getConfiguredModelId().split('/', 1)[0] || null
					: modelProviderOf(modelConfig);
			const { createModel } = await import('@n8n/agents');
			const { generateText } = await import('ai');
			const startedAt = performance.now();
			await generateText({
				model: createModel(modelConfig, createAiProxyFetch(this.outboundHttp)),
				prompt: 'Reply with OK.',
				maxOutputTokens: VERIFICATION_MAX_OUTPUT_TOKENS,
				abortSignal: AbortSignal.timeout(VERIFICATION_TIMEOUT_MS),
			});
			return { ok: true, latencyMs: Math.round(performance.now() - startedAt) };
		} catch (error) {
			const failure = classifyFailure(error);
			this.logVerificationFailure('model', failure, error, provider);
			return { ok: false, failure };
		}
	}

	async verifySandbox(
		user: User,
		request: InstanceAiVerifySandboxRequest,
	): Promise<InstanceAiVerificationResponse> {
		const provider = request.provider ?? this.globalConfig.instanceAi.sandboxProvider;
		let abortSignal: AbortSignal | undefined;
		let raceWithAbort: typeof import('@n8n/agents').raceWithAbort | undefined;
		let workspace:
			| Awaited<ReturnType<typeof import('@n8n/instance-ai')['createWorkspace']>>
			| undefined;
		try {
			const config = await this.resolveSandboxConfig(user, request);
			abortSignal = AbortSignal.timeout(config.timeout ?? VERIFICATION_TIMEOUT_MS);
			const [instanceAi, agents] = await Promise.all([
				import('@n8n/instance-ai'),
				import('@n8n/agents'),
			]);
			const { createSandbox, createWorkspace } = instanceAi;
			raceWithAbort = agents.raceWithAbort;
			const startedAt = performance.now();
			const sandbox = await raceWithAbort(async () => await createSandbox(config), abortSignal);
			if (!sandbox) throw new Error('Sandbox did not start');
			const activeWorkspace = createWorkspace(sandbox);
			if (!activeWorkspace) throw new Error('Sandbox workspace did not start');
			workspace = activeWorkspace;
			await raceWithAbort(async () => await activeWorkspace.init(), abortSignal);
			const startupMs = Math.round(performance.now() - startedAt);
			const result = await raceWithAbort(
				async () =>
					await activeWorkspace.sandbox?.executeCommand?.('printf', ['ok'], { abortSignal }),
				abortSignal,
			);
			if (!result || result.exitCode !== 0) throw new Error('Sandbox command failed');
			return { ok: true, startupMs };
		} catch (error) {
			const classifiedFailure = classifyFailure(error);
			const failure =
				provider === 'daytona' && classifiedFailure === 'forbidden'
					? 'quota_exceeded'
					: classifiedFailure;
			this.logVerificationFailure('sandbox', failure, error, provider, { provider });
			return {
				ok: false,
				failure,
			};
		} finally {
			if (workspace) {
				const cleanup = workspace.destroy().catch((error: unknown) => {
					this.logger.warn('Instance AI sandbox verification cleanup failed', {
						error: ensureError(error).message,
						provider,
					});
				});
				if (!abortSignal || abortSignal.aborted || !raceWithAbort) {
					void cleanup;
				} else {
					await raceWithAbort(cleanup, abortSignal).catch(() => {});
				}
			}
		}
	}

	async verifySearch(
		request: InstanceAiVerifySearchRequest,
	): Promise<InstanceAiVerificationResponse> {
		let provider: string | null = null;
		try {
			const connection = request.connection
				? await this.settingsService.resolveSearchConnectionForVerification(request.connection)
				: undefined;
			const saved = connection ? undefined : await this.settingsService.resolveSearchConfig();
			const braveApiKey = connectionString(connection, 'apiKey') ?? saved?.braveApiKey;
			const searxngUrl = connectionString(connection, 'apiUrl') ?? saved?.searxngUrl;
			provider = braveApiKey ? 'brave' : searxngUrl ? 'searxng' : null;
			const { braveSearch, searxngSearch } = await import('@n8n/ai-utilities');
			const options = {
				maxResults: 10,
				abortSignal: AbortSignal.timeout(VERIFICATION_TIMEOUT_MS),
			};
			const result = braveApiKey
				? await braveSearch(braveApiKey, 'n8n workflow automation', options)
				: searxngUrl
					? await searxngSearch(searxngUrl, 'n8n workflow automation', options)
					: undefined;
			if (!result) throw new Error('Search provider is not configured');
			return { ok: true, resultCount: result.results.length };
		} catch (error) {
			const failure = classifyFailure(error);
			this.logVerificationFailure('search', failure, error, provider);
			return { ok: false, failure };
		}
	}

	private logVerificationFailure(
		kind: 'model' | 'sandbox' | 'search',
		failure: InstanceAiVerificationFailure,
		error: unknown,
		provider: string | null,
		context: Record<string, unknown> = {},
	): void {
		this.logger.warn(`Instance AI ${kind} verification failed`, {
			...context,
			error: ensureError(error).message,
			failure,
		});
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_CONNECTION_FAILED, {
			component: kind === 'search' ? 'web_search' : kind,
			provider,
			failure,
			error_message: sanitizeVerificationError(error),
		});
	}

	private async resolveSandboxConfig(
		_user: User,
		request: InstanceAiVerifySandboxRequest,
	): Promise<SandboxConfig> {
		const instanceAi = this.globalConfig.instanceAi;
		const provider = request.provider ?? instanceAi.sandboxProvider;
		const connection = request.connection
			? await this.settingsService.resolveSandboxConnectionForVerification(request.connection)
			: undefined;
		if (provider === 'daytona') {
			const saved = connection ? undefined : await this.settingsService.resolveDaytonaConfig();
			return {
				enabled: true,
				provider: 'daytona',
				daytonaApiUrl:
					connectionString(connection, 'apiUrl') ?? saved?.apiUrl ?? instanceAi.daytonaApiUrl,
				daytonaApiKey:
					connectionString(connection, 'apiKey') ?? saved?.apiKey ?? instanceAi.daytonaApiKey,
				image: instanceAi.sandboxImage,
				timeout: instanceAi.sandboxTimeout,
				ephemeral: true,
			};
		}

		const saved = connection ? undefined : await this.settingsService.resolveN8nSandboxConfig();
		return {
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: request.serviceUrl ?? saved?.serviceUrl ?? instanceAi.n8nSandboxServiceUrl,
			apiKey:
				connectionString(connection, 'value') ??
				saved?.apiKey ??
				instanceAi.n8nSandboxServiceApiKey,
			timeout: instanceAi.sandboxTimeout,
		};
	}
}
