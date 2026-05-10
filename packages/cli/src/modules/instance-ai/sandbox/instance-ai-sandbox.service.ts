import type { Logger } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import {
	BuilderSandboxFactory,
	BuilderSandboxSessionRegistry,
	createSandbox,
	createWorkspace,
	SnapshotManager,
	type SandboxConfig,
} from '@n8n/instance-ai';
import { nanoid } from 'nanoid';

import { N8N_VERSION } from '@/constants';
import type { AiService } from '@/services/ai.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export class InstanceAiSandboxService {
	private readonly builderSandboxSessions: BuilderSandboxSessionRegistry;

	private readonly sandboxes = new Map<
		string,
		{
			sandbox: Awaited<ReturnType<typeof createSandbox>>;
			workspace: ReturnType<typeof createWorkspace>;
		}
	>();

	constructor(
		private readonly deps: {
			instanceAiConfig: InstanceAiConfig;
			aiService: Pick<AiService, 'isProxyEnabled' | 'getClient'>;
			settingsService: Pick<
				InstanceAiSettingsService,
				'resolveDaytonaConfig' | 'resolveN8nSandboxConfig'
			>;
			logger: Logger;
			errorReporter: ErrorReporter;
		},
	) {
		this.builderSandboxSessions = new BuilderSandboxSessionRegistry(
			deps.instanceAiConfig.builderSandboxTtlMs,
		);
	}

	getSessionRegistry(): BuilderSandboxSessionRegistry {
		return this.builderSandboxSessions;
	}

	async getProxyAuth(user: User) {
		const client = await this.deps.aiService.getClient();
		const token = await client.getBuilderApiProxyToken(
			{ id: user.id },
			{ userMessageId: nanoid() },
		);
		return {
			client,
			headers: { Authorization: `${token.tokenType} ${token.accessToken}` },
		};
	}

	async resolveSandboxConfig(user: User): Promise<SandboxConfig> {
		const base = this.getSandboxConfigFromEnv();
		if (!base.enabled) return base;
		if (base.provider === 'daytona') {
			if (this.deps.aiService.isProxyEnabled()) {
				const client = await this.deps.aiService.getClient();
				const proxyConfig = await client.getSandboxProxyConfig();
				return {
					...base,
					daytonaApiUrl: client.getSandboxProxyBaseUrl(),
					image: proxyConfig.image,
					getAuthToken: async () => {
						const token = await client.getBuilderApiProxyToken(
							{ id: user.id },
							{ userMessageId: nanoid() },
						);

						return token.accessToken;
					},
				};
			}

			const daytona = await this.deps.settingsService.resolveDaytonaConfig(user);
			return {
				...base,
				daytonaApiUrl: daytona.apiUrl ?? base.daytonaApiUrl,
				daytonaApiKey: daytona.apiKey ?? base.daytonaApiKey,
			};
		}
		if (base.provider === 'n8n-sandbox') {
			const sandbox = await this.deps.settingsService.resolveN8nSandboxConfig(user);
			return {
				...base,
				serviceUrl: sandbox.serviceUrl ?? base.serviceUrl,
				apiKey: sandbox.apiKey ?? base.apiKey,
			};
		}
		return base;
	}

	async createBuilderFactory(user: User): Promise<BuilderSandboxFactory | undefined> {
		const config = await this.resolveSandboxConfig(user);
		if (!config.enabled) return undefined;

		if (config.provider === 'daytona') {
			return new BuilderSandboxFactory(
				config,
				new SnapshotManager(
					config.image,
					this.deps.logger,
					config.n8nVersion,
					this.deps.errorReporter,
				),
				this.deps.logger,
				this.deps.errorReporter,
			);
		}

		return new BuilderSandboxFactory(config, undefined, this.deps.logger);
	}

	async getOrCreateWorkspace(threadId: string, user: User) {
		const existing = this.sandboxes.get(threadId);
		if (existing) return existing;

		const config = await this.resolveSandboxConfig(user);
		if (!config.enabled) return undefined;

		const sandbox = await createSandbox(config);
		const workspace = createWorkspace(sandbox);
		if (!sandbox || !workspace) return undefined;

		const entry = { sandbox, workspace };
		this.sandboxes.set(threadId, entry);
		return entry;
	}

	async destroySandbox(threadId: string): Promise<void> {
		const entry = this.sandboxes.get(threadId);
		if (!entry?.sandbox) return;

		this.sandboxes.delete(threadId);
		try {
			if ('destroy' in entry.sandbox && typeof entry.sandbox.destroy === 'function') {
				await (entry.sandbox.destroy as () => Promise<void>)();
			}
		} catch (error) {
			this.deps.logger.warn('Failed to destroy sandbox', {
				threadId,
				error: getErrorMessage(error),
			});
		}
	}

	async cleanupThread(threadId: string, reason: string): Promise<void> {
		await this.builderSandboxSessions.cleanupThread(threadId, reason);
		await this.destroySandbox(threadId);
	}

	async cleanupAll(reason: string): Promise<void> {
		const sandboxCleanups = [...this.sandboxes.keys()].map(
			async (threadId) => await this.destroySandbox(threadId),
		);
		await Promise.allSettled([...sandboxCleanups, this.builderSandboxSessions.cleanupAll(reason)]);
	}

	private getSandboxConfigFromEnv(): SandboxConfig {
		const {
			sandboxEnabled,
			sandboxProvider,
			daytonaApiUrl,
			daytonaApiKey,
			n8nSandboxServiceUrl,
			n8nSandboxServiceApiKey,
			sandboxImage,
			sandboxTimeout,
		} = this.deps.instanceAiConfig;
		if (!sandboxEnabled) {
			return {
				enabled: false,
				provider:
					sandboxProvider === 'n8n-sandbox'
						? 'n8n-sandbox'
						: sandboxProvider === 'daytona'
							? 'daytona'
							: 'local',
				timeout: sandboxTimeout,
			};
		}

		if (sandboxProvider === 'daytona') {
			return {
				enabled: true,
				provider: 'daytona',
				daytonaApiUrl: daytonaApiUrl || undefined,
				daytonaApiKey: daytonaApiKey || undefined,
				image: sandboxImage || undefined,
				n8nVersion: N8N_VERSION || undefined,
				timeout: sandboxTimeout,
			};
		}

		if (sandboxProvider === 'n8n-sandbox') {
			return {
				enabled: true,
				provider: 'n8n-sandbox',
				serviceUrl: n8nSandboxServiceUrl || undefined,
				apiKey: n8nSandboxServiceApiKey || undefined,
				timeout: sandboxTimeout,
			};
		}

		return {
			enabled: true,
			provider: 'local',
			timeout: sandboxTimeout,
		};
	}
}
