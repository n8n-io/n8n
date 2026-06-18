import { loadDaytona } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Sandbox, SandboxState } from '@daytonaio/sdk';
import { nanoid } from 'nanoid';
import { InstanceSettings } from 'n8n-core';
import { createHash } from 'node:crypto';

import { OperationalError } from 'n8n-workflow';

import { AiService } from '@/services/ai.service';

import {
	AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
	assertKnowledgePathSegment,
	buildKnowledgeVolumeSubpath,
	type AgentKnowledgeFilesystem,
} from './agent-knowledge-storage';
import { isAgentKnowledgeBaseEnabled } from './agent-knowledge-gate';

export const AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX = 'agents-knowledgebase';

const LABEL_KNOWLEDGE_BASE = 'n8n-agents-knowledgebase';
const LABEL_PROJECT_ID = 'n8n-project-id';
const LABEL_AGENT_ID = 'n8n-agent-id';
const LABEL_USER_ID = 'n8n-user-id';

const SANDBOX_STATE_STARTED: SandboxState = 'started';

const DEAD_SANDBOX_STATES = new Set<SandboxState>([
	'destroyed',
	'destroying',
	'error',
	'build_failed',
]);

const DEFAULT_SANDBOX_IMAGE = 'daytonaio/sandbox:0.5.0';

interface KnowledgeVolumeMount {
	volumeId: string;
	mountPath: string;
	subpath: string;
}

interface AgentKnowledgeDaytonaConnection {
	apiUrl?: string;
	apiKey?: string;
	image: string;
	mode: 'direct' | 'proxy';
}

function buildSandboxScopeKey(projectId: string, agentId: string, userId: string): string {
	return `${projectId}:${agentId}:${userId}`;
}

function buildSandboxName(
	instanceId: string,
	projectId: string,
	agentId: string,
	userId: string,
	volumeMount: KnowledgeVolumeMount,
): string {
	const digest = createHash('sha256')
		.update(
			[instanceId, projectId, agentId, userId, volumeMount.volumeId, volumeMount.subpath].join(
				'\0',
			),
		)
		.digest('hex')
		.slice(0, 24);

	return `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}-${digest}`;
}

function buildScopeLabels(
	projectId: string,
	agentId: string,
	userId: string,
): Record<string, string> {
	return {
		[LABEL_KNOWLEDGE_BASE]: 'true',
		[LABEL_PROJECT_ID]: projectId,
		[LABEL_AGENT_ID]: agentId,
		[LABEL_USER_ID]: userId,
	};
}

function isVolumeMountFailure(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /volume|mount|subpath/i.test(message);
}

function isUsableSandbox(sandbox: Sandbox): boolean {
	const state = sandbox.state;
	if (!state) return true;
	return !DEAD_SANDBOX_STATES.has(state);
}

function hasMatchingVolumeMount(sandbox: Sandbox, expected: KnowledgeVolumeMount): boolean {
	const volumes = sandbox.volumes ?? [];
	return volumes.some((volume) => {
		const mount = volume as KnowledgeVolumeMount;
		return (
			mount.volumeId === expected.volumeId &&
			mount.mountPath === expected.mountPath &&
			mount.subpath === expected.subpath
		);
	});
}

@Service()
export class AgentKnowledgeSandboxService {
	private readonly pendingSandboxAcquisitions = new Map<string, Promise<Sandbox>>();

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
		private readonly aiService: AiService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async withKnowledgeFilesystem<T>(
		projectId: string,
		agentId: string,
		userId: string,
		operation: (filesystem: AgentKnowledgeFilesystem) => Promise<T>,
	): Promise<T> {
		const filesystem = await this.getKnowledgeFilesystem(projectId, agentId, userId);
		return await operation(filesystem);
	}

	async getKnowledgeFilesystem(
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<AgentKnowledgeFilesystem> {
		// Callers (AgentKnowledgeService) verify project↔agent ownership before
		// invoking filesystem operations, so only configuration is asserted here.
		this.assertKnowledgeConfiguration(projectId, agentId);
		const sandbox = await this.acquireSandbox(projectId, agentId, userId);
		return this.createFilesystemAdapter(sandbox);
	}

	private createFilesystemAdapter(sandbox: Sandbox): AgentKnowledgeFilesystem {
		return {
			uploadFiles: async (files) => {
				if (files.length === 0) {
					return;
				}
				await sandbox.fs.uploadFiles(
					files.map((file) => ({ source: file.source, destination: file.destination })),
				);
			},
			deleteFile: async (filePath, recursive) => await sandbox.fs.deleteFile(filePath, recursive),
			ensureDir: async (dirPath) => await sandbox.fs.createFolder(dirPath, '755'),
		};
	}

	private async acquireSandbox(
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<Sandbox> {
		const cacheKey = buildSandboxScopeKey(projectId, agentId, userId);
		let pending = this.pendingSandboxAcquisitions.get(cacheKey);

		if (!pending) {
			pending = this.acquireSandboxFresh(projectId, agentId, userId).finally(() => {
				this.pendingSandboxAcquisitions.delete(cacheKey);
			});
			this.pendingSandboxAcquisitions.set(cacheKey, pending);
		}

		return await pending;
	}

	private async acquireSandboxFresh(
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<Sandbox> {
		const { Daytona, DaytonaNotFoundError } = loadDaytona();
		const connection = await this.resolveDaytonaConnection(userId);
		const daytona = new Daytona({
			apiUrl: connection.apiUrl,
			apiKey: connection.apiKey,
		});
		const labels = buildScopeLabels(projectId, agentId, userId);
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
		const volumeMount = this.buildVolumeMount(projectId, agentId);
		const name = buildSandboxName(
			this.instanceSettings.instanceId,
			projectId,
			agentId,
			userId,
			volumeMount,
		);
		const image = connection.image;

		try {
			const sandbox = await daytona.get(name);
			if (isUsableSandbox(sandbox) && hasMatchingVolumeMount(sandbox, volumeMount)) {
				if (sandbox.state !== SANDBOX_STATE_STARTED) {
					await sandbox.start(timeoutSeconds);
				}

				const reusableSandbox = await this.resolveReusableSandbox(daytona, sandbox, connection);
				this.logger.debug('Reused agent knowledge sandbox', { projectId, agentId });
				return reusableSandbox;
			}

			await sandbox.delete(timeoutSeconds).catch(() => {});
		} catch (error) {
			if (!(error instanceof DaytonaNotFoundError)) {
				throw error;
			}
		}

		let sandbox: Sandbox | undefined;
		try {
			const baseCreateParams = {
				name,
				labels,
				language: 'typescript',
				ephemeral: this.agentsConfig.sandboxEphemeral,
				autoStopInterval: this.agentsConfig.sandboxAutoStopMinutes,
				...(!this.agentsConfig.sandboxEphemeral
					? {
							autoArchiveInterval: this.agentsConfig.sandboxAutoArchiveMinutes,
							autoDeleteInterval: this.agentsConfig.sandboxAutoDeleteMinutes,
						}
					: {}),
				volumes: [volumeMount],
			};
			const createCandidates = [
				...(this.agentsConfig.sandboxSnapshot
					? [
							{
								strategy: 'snapshot' as const,
								params: {
									...baseCreateParams,
									snapshot: this.agentsConfig.sandboxSnapshot,
								},
							},
						]
					: []),
				{
					strategy: 'image' as const,
					params: {
						...baseCreateParams,
						image,
						resources: { disk: this.agentsConfig.sandboxDiskGb },
					},
				},
			];
			let lastCreateError: unknown;
			for (const candidate of createCandidates) {
				try {
					sandbox = await daytona.create(candidate.params, { timeout: timeoutSeconds });
					break;
				} catch (error) {
					lastCreateError = error;
					if (candidate.strategy === 'snapshot') {
						this.logger.warn(
							'Agent knowledge sandbox create from snapshot failed; falling back to image',
							{
								projectId,
								agentId,
								snapshotName: this.agentsConfig.sandboxSnapshot,
								error: error instanceof Error ? error.message : String(error),
							},
						);
						continue;
					}
					throw error;
				}
			}
			if (!sandbox) {
				throw lastCreateError instanceof Error
					? lastCreateError
					: new Error('Failed to create agent knowledge sandbox');
			}
		} catch (error) {
			if (connection.mode === 'proxy' && isVolumeMountFailure(error)) {
				const message = error instanceof Error ? error.message : String(error);
				throw new OperationalError(
					`Agent knowledge sandbox creation failed through the AI Assistant sandbox proxy: ${message}. If the proxy does not support volume mounts, enable them before using the agent knowledge base.`,
					{ cause: error },
				);
			}
			throw error;
		}

		this.logger.debug('Created agent knowledge sandbox', { projectId, agentId, name });
		return sandbox;
	}

	private async resolveDaytonaConnection(userId: string): Promise<AgentKnowledgeDaytonaConnection> {
		const directImage = this.agentsConfig.sandboxImage || DEFAULT_SANDBOX_IMAGE;

		if (!this.aiService.isProxyEnabled()) {
			return {
				mode: 'direct',
				apiUrl: this.agentsConfig.daytonaApiUrl || undefined,
				apiKey: this.agentsConfig.daytonaApiKey || undefined,
				image: directImage,
			};
		}

		const client = await this.aiService.getClient();
		const proxyConfig = await client.getSandboxProxyConfig();
		const token = await client.getBuilderApiProxyToken({ id: userId }, { userMessageId: nanoid() });

		return {
			mode: 'proxy',
			apiUrl: client.getSandboxProxyBaseUrl(),
			apiKey: token.accessToken,
			image: proxyConfig.image || directImage,
		};
	}

	private buildVolumeMount(projectId: string, agentId: string): KnowledgeVolumeMount {
		return {
			volumeId: this.agentsConfig.daytonaVolumeId,
			mountPath: AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
			subpath: buildKnowledgeVolumeSubpath(this.instanceSettings.instanceId, projectId, agentId),
		};
	}

	private async resolveReusableSandbox(
		daytona: { get: (name: string) => Promise<Sandbox> },
		sandbox: Sandbox,
		connection: AgentKnowledgeDaytonaConnection,
	): Promise<Sandbox> {
		if (connection.mode !== 'proxy') {
			return sandbox;
		}

		return await daytona.get(sandbox.name);
	}

	private assertKnowledgeConfiguration(projectId: string, agentId: string): void {
		this.assertKnowledgeBaseEnabled();
		this.assertValidPathSegments(projectId, agentId);
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

	private assertKnowledgeBaseEnabled(): void {
		if (isAgentKnowledgeBaseEnabled(this.agentsConfig)) {
			return;
		}

		if (
			this.agentsConfig.sandboxEnabled &&
			this.agentsConfig.sandboxProvider === 'daytona' &&
			!this.agentsConfig.daytonaVolumeId.trim()
		) {
			throw new OperationalError('Agent knowledge Daytona volume is not configured');
		}

		throw new OperationalError('Agent knowledge sandbox is not enabled');
	}
}
