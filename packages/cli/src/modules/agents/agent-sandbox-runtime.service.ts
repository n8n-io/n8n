import { redactText } from '@n8n/agents';
import {
	createFilesystem,
	createSandbox,
	getPromptWorkspaceRoot,
	type CommandResult,
	type DaytonaSandboxConfig,
	type N8nSandboxConfig,
	type SandboxProvider,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { v5 as uuidv5 } from 'uuid';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AiService } from '@/services/ai.service';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';
import { callAiServiceWithRetry } from '@/utils/ai-service-retry';

import { assertKnowledgePathSegment } from './agent-knowledge-storage';
import { AgentRepository } from './repositories/agent.repository';

export const AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX = 'agent-';

const AGENT_KNOWLEDGE_SANDBOX_NAMESPACE = '5b5fd8cd-59c1-5914-aabc-cf7257fb46bc';
const MAX_SANDBOX_ERROR_DETAIL_CHARS = 2_000;

const LABEL_KNOWLEDGE_BASE = 'n8n-agents-knowledgebase';
const LABEL_PROJECT_ID = 'n8n-project-id';
const LABEL_AGENT_ID = 'n8n-agent-id';

const DEFAULT_SANDBOX_IMAGE = 'daytonaio/sandbox:0.5.0';
const AUTO_STOP_INTERVAL_MINUTES = 5;

export interface AgentSandboxRuntime {
	provider: SandboxProvider;
	sandbox: WorkspaceSandbox;
	filesystem: WorkspaceFilesystem;
	workspaceRoot: string;
	cacheKey: string;
}

function buildSandboxName(scope: {
	instanceId: string;
	projectId: string;
	agentId: string;
}): string {
	return `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}${scope.instanceId}-${scope.projectId}-${scope.agentId}`.toLowerCase();
}

function buildN8nSandboxId(sandboxName: string): string {
	return uuidv5(sandboxName, AGENT_KNOWLEDGE_SANDBOX_NAMESPACE);
}

function buildScopeLabels(projectId: string, agentId: string): Record<string, string> {
	return {
		[LABEL_KNOWLEDGE_BASE]: 'true',
		[LABEL_PROJECT_ID]: projectId,
		[LABEL_AGENT_ID]: agentId,
	};
}

function truncateSandboxErrorDetail(value: string): string {
	if (value.length <= MAX_SANDBOX_ERROR_DETAIL_CHARS) return value;
	return `${value.slice(0, MAX_SANDBOX_ERROR_DETAIL_CHARS)}...[truncated]`;
}

/** Redact secrets before truncating so a match cut in half cannot leak. */
export function sanitizeSandboxErrorDetail(value: string): string {
	return truncateSandboxErrorDetail(redactText(value).text.trimEnd());
}

@Service()
export class AgentSandboxRuntimeService {
	private readonly pendingSandboxAcquisitions = new Map<string, Promise<AgentSandboxRuntime>>();

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
		private readonly aiService: AiService,
		private readonly instanceSettings: InstanceSettings,
		private readonly agentRepository: AgentRepository,
		private readonly sandboxSettingsService: SandboxSettingsService,
	) {}

	async warmSandbox(projectId: string, agentId: string): Promise<void> {
		this.assertSandboxConfiguration(projectId, agentId);
		await this.acquireSandbox(projectId, agentId);
	}

	/**
	 * Best-effort sandbox teardown for agent/project deletion. Never throws —
	 * callers must not have cleanup failures block the parent delete operation.
	 */
	async destroySandbox(projectId: string, agentId: string): Promise<void> {
		const sandboxName = buildSandboxName({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
		});
		const sandboxes = [
			['daytona', sandboxName],
			['n8n-sandbox', buildN8nSandboxId(sandboxName)],
		] as const;

		for (const [provider, sandboxId] of sandboxes) {
			await this.tryDestroySandbox(projectId, agentId, provider, sandboxId);
		}
	}

	async acquireSandbox(projectId: string, agentId: string): Promise<AgentSandboxRuntime> {
		const provider = this.sandboxSettingsService.getProvider();
		const sandboxName = buildSandboxName({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
		});
		const cacheKey = `${provider}:${sandboxName}`;
		let pending = this.pendingSandboxAcquisitions.get(cacheKey);

		if (!pending) {
			pending = this.acquireSandboxFresh(
				projectId,
				agentId,
				provider,
				sandboxName,
				cacheKey,
			).finally(() => {
				this.pendingSandboxAcquisitions.delete(cacheKey);
			});
			this.pendingSandboxAcquisitions.set(cacheKey, pending);
		}

		return await pending;
	}

	async executeSandboxCommand(
		sandbox: WorkspaceSandbox,
		command: string,
		timeout: number,
	): Promise<CommandResult> {
		if (!sandbox.executeCommand) {
			throw new OperationalError('Agent knowledge sandbox does not support command execution');
		}
		return await sandbox.executeCommand(command, [], { timeout });
	}

	assertSandboxConfiguration(projectId: string, agentId: string): void {
		if (!this.agentsConfig.sandboxEnabled) {
			throw new OperationalError('Agent knowledge sandbox is not enabled');
		}
		this.assertValidPathSegments(projectId, agentId);
	}

	private async tryDestroySandbox(
		projectId: string,
		agentId: string,
		provider: SandboxProvider,
		sandboxId: string,
	): Promise<void> {
		try {
			const config =
				provider === 'daytona'
					? await this.resolveDaytonaSandboxConfig(projectId, agentId, sandboxId)
					: await this.resolveN8nSandboxConfig(sandboxId);
			const sandbox = await createSandbox(config, { logger: this.logger });
			if (!sandbox?.destroy) {
				throw new OperationalError('Agent knowledge sandbox does not support provider destroy');
			}
			await sandbox.destroy();
		} catch (error) {
			this.logger.warn('Failed to destroy agent knowledge sandbox', {
				projectId,
				agentId,
				provider,
				sandboxId,
				error: sanitizeSandboxErrorDetail(error instanceof Error ? error.message : String(error)),
			});
		}
	}

	private async acquireSandboxFresh(
		projectId: string,
		agentId: string,
		provider: SandboxProvider,
		sandboxName: string,
		cacheKey: string,
	): Promise<AgentSandboxRuntime> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const config =
			provider === 'daytona'
				? await this.resolveDaytonaSandboxConfig(projectId, agentId, sandboxName)
				: await this.resolveN8nSandboxConfig(buildN8nSandboxId(sandboxName));
		return await this.startSandbox(config, projectId, agentId, cacheKey);
	}

	private async startSandbox(
		config: DaytonaSandboxConfig | N8nSandboxConfig,
		projectId: string,
		agentId: string,
		cacheKey: string,
	): Promise<AgentSandboxRuntime> {
		const { provider } = config;
		const sandbox = await createSandbox(config, { logger: this.logger });
		if (!sandbox?._start) {
			throw new OperationalError('Agent knowledge sandbox does not support lifecycle start');
		}
		await sandbox._start();
		const filesystem = createFilesystem(sandbox);
		const workspaceRoot = getPromptWorkspaceRoot(provider);
		this.logger.debug('Acquired agent knowledge sandbox', {
			projectId,
			agentId,
			provider,
			sandboxId: sandbox.id,
		});
		return {
			provider,
			sandbox,
			filesystem,
			workspaceRoot,
			cacheKey: `${cacheKey}:${sandbox.id}`,
		};
	}

	private async resolveDaytonaSandboxConfig(
		projectId: string,
		agentId: string,
		sandboxId: string,
	): Promise<DaytonaSandboxConfig> {
		const directImage = this.agentsConfig.sandboxImage || DEFAULT_SANDBOX_IMAGE;
		const snapshot = this.agentsConfig.sandboxSnapshot.trim() || undefined;
		const baseConfig: DaytonaSandboxConfig = {
			enabled: true,
			provider: 'daytona',
			id: sandboxId,
			name: sandboxId,
			labels: buildScopeLabels(projectId, agentId),
			timeout: this.agentsConfig.sandboxTimeout,
			createTimeoutSeconds: Math.ceil(this.agentsConfig.sandboxTimeout / 1000),
			ephemeral: false,
			autoStopInterval: AUTO_STOP_INTERVAL_MINUTES,
		};

		if (!this.aiService.isProxyEnabled()) {
			const daytona = await this.sandboxSettingsService.resolveDaytonaConfig();
			return {
				...baseConfig,
				daytonaApiUrl: daytona.apiUrl,
				daytonaApiKey: daytona.apiKey,
				image: directImage,
				snapshot,
			};
		}

		const client = await this.aiService.getClient();
		if (!snapshot) {
			throw new OperationalError(
				'Agent knowledge sandbox requires a snapshot when Daytona is reached through the AI service proxy. Set N8N_AGENTS_AI_SANDBOX_SNAPSHOT to a snapshot available to the instance.',
			);
		}

		return {
			...baseConfig,
			daytonaApiUrl: client.getSandboxProxyBaseUrl(),
			snapshot,
			getAuthToken: async () => {
				const token = await callAiServiceWithRetry(
					'Agent knowledge sandbox proxy token mint',
					async () =>
						await client.getBuilderApiProxyToken({ id: projectId }, { userMessageId: nanoid() }),
					this.logger,
				);
				return token.accessToken;
			},
		};
	}

	private async resolveN8nSandboxConfig(sandboxId: string): Promise<N8nSandboxConfig> {
		const { serviceUrl, apiKey } = await this.sandboxSettingsService.resolveN8nSandboxConfig();
		const normalizedServiceUrl = serviceUrl?.trim();
		if (!normalizedServiceUrl) {
			throw new OperationalError(
				'Agent knowledge sandbox requires the n8n sandbox service URL. Set N8N_SANDBOX_SERVICE_URL.',
			);
		}

		return {
			enabled: true,
			provider: 'n8n-sandbox',
			id: sandboxId,
			serviceUrl: normalizedServiceUrl,
			apiKey,
			timeout: this.agentsConfig.sandboxTimeout,
		};
	}

	private assertValidPathSegments(projectId: string, agentId: string): void {
		try {
			assertKnowledgePathSegment(this.instanceSettings.instanceId, 'instance id');
			assertKnowledgePathSegment(projectId, 'project id');
			assertKnowledgePathSegment(agentId, 'agent id');
		} catch (error) {
			throw new OperationalError(
				error instanceof Error ? error.message : 'Invalid agent knowledge storage scope',
			);
		}
	}
}
