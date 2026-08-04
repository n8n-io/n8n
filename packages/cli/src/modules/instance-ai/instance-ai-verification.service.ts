import type {
	InstanceAiConnectionUpdate,
	InstanceAiVerificationFailure,
	InstanceAiVerificationResponse,
	InstanceAiVerifyModelRequest,
	InstanceAiVerifySandboxRequest,
	InstanceAiVerifySearchRequest,
} from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { SandboxConfig } from '@n8n/instance-ai';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { InstanceAiModelService } from './instance-ai-model.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';

const VERIFICATION_TIMEOUT_MS = 30_000;

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
		private readonly globalConfig: GlobalConfig,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly modelService: InstanceAiModelService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async verifyModel(
		user: User,
		request: InstanceAiVerifyModelRequest,
	): Promise<InstanceAiVerificationResponse> {
		try {
			const connection = request.connection
				? await this.settingsService.resolveModelConnectionForVerification(request.connection)
				: undefined;
			const modelConfig = connection
				? this.settingsService.buildModelConfigForConnection(connection, request.modelName ?? '')
				: request.modelName
					? await this.settingsService.resolveModelConfigForVerification(user, request.modelName)
					: await this.modelService.resolveAgentModelConfig(user);
			const { createModel } = await import('@n8n/agents');
			const { generateText } = await import('ai');
			const startedAt = performance.now();
			await generateText({
				model: createModel(modelConfig, createAiProxyFetch(this.outboundHttp)),
				prompt: 'Reply with OK.',
				maxOutputTokens: 8,
				abortSignal: AbortSignal.timeout(VERIFICATION_TIMEOUT_MS),
			});
			return { ok: true, latencyMs: Math.round(performance.now() - startedAt) };
		} catch (error) {
			return { ok: false, failure: classifyFailure(error) };
		}
	}

	async verifySandbox(
		user: User,
		request: InstanceAiVerifySandboxRequest,
	): Promise<InstanceAiVerificationResponse> {
		const provider = request.provider ?? this.globalConfig.instanceAi.sandboxProvider;
		let workspace:
			| Awaited<ReturnType<typeof import('@n8n/instance-ai')['createWorkspace']>>
			| undefined;
		try {
			const config = await this.resolveSandboxConfig(user, request);
			const { createSandbox, createWorkspace } = await import('@n8n/instance-ai');
			const startedAt = performance.now();
			const sandbox = await createSandbox(config);
			if (!sandbox) throw new Error('Sandbox did not start');
			workspace = createWorkspace(sandbox);
			if (!workspace) throw new Error('Sandbox workspace did not start');
			await workspace.init();
			const startupMs = Math.round(performance.now() - startedAt);
			const result = await workspace.sandbox?.executeCommand?.('printf', ['ok']);
			if (!result || result.exitCode !== 0) throw new Error('Sandbox command failed');
			return { ok: true, startupMs };
		} catch (error) {
			const failure = classifyFailure(error);
			return {
				ok: false,
				failure: provider === 'daytona' && failure === 'forbidden' ? 'quota_exceeded' : failure,
			};
		} finally {
			await workspace?.destroy().catch(() => {});
		}
	}

	async verifySearch(
		request: InstanceAiVerifySearchRequest,
	): Promise<InstanceAiVerificationResponse> {
		try {
			const connection = request.connection
				? await this.settingsService.resolveSearchConnectionForVerification(request.connection)
				: undefined;
			const saved = connection ? undefined : await this.settingsService.resolveSearchConfig();
			const braveApiKey = connectionString(connection, 'apiKey') ?? saved?.braveApiKey;
			const searxngUrl = connectionString(connection, 'apiUrl') ?? saved?.searxngUrl;
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
			return { ok: false, failure: classifyFailure(error) };
		}
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
		};
	}
}
