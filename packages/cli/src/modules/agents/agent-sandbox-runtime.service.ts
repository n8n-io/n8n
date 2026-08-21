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
import type { AgentSandboxPrincipalHash } from './agent-sandbox-principal';
import { AgentRepository } from './repositories/agent.repository';

const WORKSPACE_SANDBOX_NAMESPACE = '38348f53-e947-42c7-8c04-83aa154be385';
const KNOWLEDGE_SANDBOX_NAMESPACE = '51989c13-3ae7-4167-8e64-d874dd068795';
const WORKSPACE_SANDBOX_NAME_PREFIX = 'agent-ws-';
const KNOWLEDGE_SANDBOX_NAME_PREFIX = 'agent-kb-';
const MAX_SANDBOX_ERROR_DETAIL_CHARS = 2_000;

const LABEL_KNOWLEDGE_BASE = 'n8n-agents-knowledgebase';
const LABEL_PROJECT_ID = 'n8n-project-id';
const LABEL_AGENT_ID = 'n8n-agent-id';
const LABEL_SANDBOX_KIND = 'n8n-agent-sandbox-kind';
const LABEL_PRINCIPAL_HASH = 'n8n-agent-principal-hash';

const DEFAULT_SANDBOX_IMAGE = 'daytonaio/sandbox:0.5.0';
const WORKSPACE_AUTO_STOP_INTERVAL_MINUTES = 5;
const KNOWLEDGE_AUTO_STOP_INTERVAL_MINUTES = 15;
const KNOWLEDGE_AUTO_ARCHIVE_INTERVAL_MINUTES = 60;
const KNOWLEDGE_AUTO_DELETE_INTERVAL_MINUTES = 7 * 24 * 60;

type DaytonaSandboxLifecycle = Pick<
	DaytonaSandboxConfig,
	'ephemeral' | 'autoStopInterval' | 'autoArchiveInterval' | 'autoDeleteInterval'
>;

export interface AgentSandboxRuntime {
	provider: SandboxProvider;
	sandbox: WorkspaceSandbox;
	filesystem: WorkspaceFilesystem;
	workspaceRoot: string;
	cacheKey: string;
}

function buildWorkspaceSandboxId(scope: {
	instanceId: string;
	projectId: string;
	agentId: string;
	principalHash: AgentSandboxPrincipalHash;
}): string {
	return uuidv5(
		JSON.stringify([scope.instanceId, scope.projectId, scope.agentId, scope.principalHash]),
		WORKSPACE_SANDBOX_NAMESPACE,
	);
}

function buildKnowledgeSandboxId(scope: {
	instanceId: string;
	projectId: string;
	agentId: string;
}): string {
	return uuidv5(
		JSON.stringify([scope.instanceId, scope.projectId, scope.agentId]),
		KNOWLEDGE_SANDBOX_NAMESPACE,
	);
}

function buildWorkspaceLabels(
	projectId: string,
	agentId: string,
	principalHash: AgentSandboxPrincipalHash,
): Record<string, string> {
	return {
		[LABEL_PROJECT_ID]: projectId,
		[LABEL_AGENT_ID]: agentId,
		[LABEL_SANDBOX_KIND]: 'workspace',
		[LABEL_PRINCIPAL_HASH]: principalHash,
	};
}

function buildKnowledgeLabels(projectId: string, agentId: string): Record<string, string> {
	return {
		[LABEL_KNOWLEDGE_BASE]: 'true',
		[LABEL_PROJECT_ID]: projectId,
		[LABEL_AGENT_ID]: agentId,
		[LABEL_SANDBOX_KIND]: 'knowledge',
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

	async warmKnowledgeSandbox(projectId: string, agentId: string): Promise<void> {
		this.assertSandboxConfiguration(projectId, agentId);
		await this.acquireKnowledgeSandbox(projectId, agentId);
	}

	async destroyWorkspaceSandbox(
		projectId: string,
		agentId: string,
		principalHash: AgentSandboxPrincipalHash,
	): Promise<void> {
		const sandboxId = buildWorkspaceSandboxId({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
			principalHash,
		});
		await this.destroySandboxByIdentity(
			projectId,
			agentId,
			`${WORKSPACE_SANDBOX_NAME_PREFIX}${sandboxId}`,
			sandboxId,
			buildWorkspaceLabels(projectId, agentId, principalHash),
		);
	}

	async destroyKnowledgeSandbox(projectId: string, agentId: string): Promise<void> {
		const sandboxId = buildKnowledgeSandboxId({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
		});
		await this.destroySandboxByIdentity(
			projectId,
			agentId,
			`${KNOWLEDGE_SANDBOX_NAME_PREFIX}${sandboxId}`,
			sandboxId,
			buildKnowledgeLabels(projectId, agentId),
		);
	}

	async acquireWorkspaceSandbox(
		projectId: string,
		agentId: string,
		principalHash: AgentSandboxPrincipalHash,
	): Promise<AgentSandboxRuntime> {
		const provider = this.sandboxSettingsService.getProvider();
		const sandboxId = buildWorkspaceSandboxId({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
			principalHash,
		});
		return await this.acquireSandboxByIdentity(
			projectId,
			agentId,
			provider,
			`${WORKSPACE_SANDBOX_NAME_PREFIX}${sandboxId}`,
			sandboxId,
			buildWorkspaceLabels(projectId, agentId, principalHash),
			`${provider}:workspace:${sandboxId}`,
			{
				ephemeral: true,
				autoStopInterval: WORKSPACE_AUTO_STOP_INTERVAL_MINUTES,
			},
		);
	}

	async acquireKnowledgeSandbox(projectId: string, agentId: string): Promise<AgentSandboxRuntime> {
		const provider = this.sandboxSettingsService.getProvider();
		const sandboxId = buildKnowledgeSandboxId({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
		});
		return await this.acquireSandboxByIdentity(
			projectId,
			agentId,
			provider,
			`${KNOWLEDGE_SANDBOX_NAME_PREFIX}${sandboxId}`,
			sandboxId,
			buildKnowledgeLabels(projectId, agentId),
			`${provider}:knowledge:${sandboxId}`,
			{
				ephemeral: this.agentsConfig.sandboxEphemeral,
				autoStopInterval: KNOWLEDGE_AUTO_STOP_INTERVAL_MINUTES,
				autoArchiveInterval: KNOWLEDGE_AUTO_ARCHIVE_INTERVAL_MINUTES,
				...(this.agentsConfig.sandboxEphemeral
					? {}
					: { autoDeleteInterval: KNOWLEDGE_AUTO_DELETE_INTERVAL_MINUTES }),
			},
		);
	}

	private async acquireSandboxByIdentity(
		projectId: string,
		agentId: string,
		provider: SandboxProvider,
		daytonaName: string,
		n8nSandboxId: string,
		labels: Record<string, string>,
		cacheKey: string,
		daytonaLifecycle: DaytonaSandboxLifecycle,
	): Promise<AgentSandboxRuntime> {
		let pending = this.pendingSandboxAcquisitions.get(cacheKey);

		if (!pending) {
			pending = this.acquireSandboxFresh(
				projectId,
				agentId,
				provider,
				daytonaName,
				n8nSandboxId,
				labels,
				cacheKey,
				daytonaLifecycle,
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

	isEnabled(): boolean {
		return this.sandboxSettingsService.isAgentSandboxEnabled();
	}

	assertSandboxConfiguration(projectId: string, agentId: string): void {
		if (!this.isEnabled()) {
			throw new OperationalError('Agent knowledge sandbox is not enabled');
		}
		this.assertValidPathSegments(projectId, agentId);
	}

	private async destroySandboxByIdentity(
		projectId: string,
		agentId: string,
		daytonaName: string,
		n8nSandboxId: string,
		labels: Record<string, string>,
	): Promise<void> {
		const sandboxes = [
			['daytona', daytonaName],
			['n8n-sandbox', n8nSandboxId],
		] as const;

		for (const [provider, sandboxId] of sandboxes) {
			await this.tryDestroySandbox(projectId, agentId, provider, sandboxId, labels);
		}
	}

	private async tryDestroySandbox(
		projectId: string,
		agentId: string,
		provider: SandboxProvider,
		sandboxId: string,
		labels: Record<string, string>,
	): Promise<void> {
		try {
			const config =
				provider === 'daytona'
					? await this.resolveDaytonaSandboxConfig(projectId, sandboxId, labels)
					: await this.resolveN8nSandboxConfig(sandboxId);
			const sandbox = await createSandbox(config, { logger: this.logger });
			// deleteRemote deletes by sandbox identity even though this instance never
			// started it; destroy() is scoped to remotes the instance acquired.
			if (!sandbox?.deleteRemote) {
				throw new OperationalError('Agent knowledge sandbox does not support provider destroy');
			}
			await sandbox.deleteRemote();
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
		daytonaName: string,
		n8nSandboxId: string,
		labels: Record<string, string>,
		cacheKey: string,
		daytonaLifecycle: DaytonaSandboxLifecycle,
	): Promise<AgentSandboxRuntime> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const config =
			provider === 'daytona'
				? await this.resolveDaytonaSandboxConfig(projectId, daytonaName, labels, daytonaLifecycle)
				: await this.resolveN8nSandboxConfig(n8nSandboxId);
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
		sandboxId: string,
		labels: Record<string, string>,
		lifecycle: DaytonaSandboxLifecycle = {},
	): Promise<DaytonaSandboxConfig> {
		const directImage = this.agentsConfig.sandboxImage || DEFAULT_SANDBOX_IMAGE;
		const snapshot = this.agentsConfig.sandboxSnapshot.trim() || undefined;
		const baseConfig: DaytonaSandboxConfig = {
			enabled: true,
			provider: 'daytona',
			id: sandboxId,
			name: sandboxId,
			labels,
			timeout: this.agentsConfig.sandboxTimeout,
			createTimeoutSeconds: Math.ceil(this.agentsConfig.sandboxTimeout / 1000),
			...lifecycle,
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
