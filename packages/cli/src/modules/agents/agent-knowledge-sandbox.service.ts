import { loadDaytona } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Sandbox, SandboxState } from '@daytonaio/sdk';
import { randomUUID } from 'node:crypto';

import { OperationalError } from 'n8n-workflow';

import {
	AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
	assertKnowledgePathSegment,
	buildKnowledgeVolumeSubpath,
	type AgentKnowledgeFilesystem,
} from './agent-knowledge-storage';

export const SEARCH_KNOWLEDGE_SANDBOX_CREATED = 'sandbox created' as const;
export const SEARCH_KNOWLEDGE_SANDBOX_REUSED = 'sandbox reused' as const;
export const AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX = 'agents-knowledgebase';

export type SearchKnowledgeSandboxResult =
	| typeof SEARCH_KNOWLEDGE_SANDBOX_CREATED
	| typeof SEARCH_KNOWLEDGE_SANDBOX_REUSED;

const LABEL_KNOWLEDGE_BASE = 'n8n-agents-knowledgebase';
const LABEL_PROJECT_ID = 'n8n-project-id';
const LABEL_AGENT_ID = 'n8n-agent-id';

const SANDBOX_STATE_STARTED: SandboxState = 'started';

const DEAD_SANDBOX_STATES = new Set<SandboxState>([
	'destroyed',
	'destroying',
	'error',
	'build_failed',
]);

const DEFAULT_SANDBOX_IMAGE = 'daytonaio/sandbox:0.5.0';
const AUTO_STOP_INTERVAL_MINUTES = 5;
const SANDBOX_LIST_PAGE_SIZE = 100;

interface KnowledgeVolumeMount {
	volumeId: string;
	mountPath: string;
	subpath: string;
}

function buildScopeLabels(projectId: string, agentId: string): Record<string, string> {
	return {
		[LABEL_KNOWLEDGE_BASE]: 'true',
		[LABEL_PROJECT_ID]: projectId,
		[LABEL_AGENT_ID]: agentId,
	};
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
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
	) {}

	async ensureSandbox(projectId: string, agentId: string): Promise<SearchKnowledgeSandboxResult> {
		const { reused } = await this.acquireSandbox(projectId, agentId);
		return reused ? SEARCH_KNOWLEDGE_SANDBOX_REUSED : SEARCH_KNOWLEDGE_SANDBOX_CREATED;
	}

	async withKnowledgeFilesystem<T>(
		projectId: string,
		agentId: string,
		operation: (filesystem: AgentKnowledgeFilesystem) => Promise<T>,
	): Promise<T> {
		const { sandbox } = await this.acquireSandbox(projectId, agentId);
		const filesystem = this.createFilesystemAdapter(sandbox);
		return await operation(filesystem);
	}

	private createFilesystemAdapter(sandbox: Sandbox): AgentKnowledgeFilesystem {
		return {
			readFile: async (filePath) => await sandbox.fs.downloadFile(filePath),
			writeFile: async (filePath, content) => {
				const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
				const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
				if (parentDir) {
					await sandbox.fs.createFolder(parentDir, '755').catch(() => undefined);
				}
				await sandbox.fs.uploadFile(buffer, filePath);
			},
			deleteFile: async (filePath, recursive) => await sandbox.fs.deleteFile(filePath, recursive),
			ensureDir: async (dirPath) => await sandbox.fs.createFolder(dirPath, '755'),
		};
	}

	private async acquireSandbox(
		projectId: string,
		agentId: string,
	): Promise<{ sandbox: Sandbox; reused: boolean }> {
		this.assertKnowledgeSandboxEnabled();
		this.assertKnowledgeVolumeConfigured();
		this.assertValidPathSegments(projectId, agentId);

		const { Daytona } = loadDaytona();
		const daytona = new Daytona({
			apiUrl: this.agentsConfig.daytonaApiUrl || undefined,
			apiKey: this.agentsConfig.daytonaApiKey || undefined,
		});
		const labels = buildScopeLabels(projectId, agentId);
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
		const volumeMount = this.buildVolumeMount(projectId, agentId);

		let page = 1;
		while (true) {
			const listedSandboxes = await daytona.list(labels, page, SANDBOX_LIST_PAGE_SIZE);
			for (const sandbox of listedSandboxes.items) {
				if (!isUsableSandbox(sandbox) || !hasMatchingVolumeMount(sandbox, volumeMount)) {
					continue;
				}

				if (sandbox.state !== SANDBOX_STATE_STARTED) {
					await sandbox.start(timeoutSeconds);
				}

				this.logger.debug('Reused agent knowledge sandbox', { projectId, agentId });
				return { sandbox, reused: true };
			}

			if (page >= listedSandboxes.totalPages) {
				break;
			}
			page += 1;
		}

		const name = `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}-${randomUUID()}`;
		const image = this.agentsConfig.sandboxImage || DEFAULT_SANDBOX_IMAGE;

		const sandbox = await daytona.create(
			{
				name,
				labels,
				language: 'typescript',
				image,
				autoStopInterval: AUTO_STOP_INTERVAL_MINUTES,
				volumes: [volumeMount],
			},
			{ timeout: timeoutSeconds },
		);

		this.logger.debug('Created agent knowledge sandbox', { projectId, agentId, name });
		return { sandbox, reused: false };
	}

	private buildVolumeMount(projectId: string, agentId: string): KnowledgeVolumeMount {
		return {
			volumeId: this.agentsConfig.daytonaVolumeId,
			mountPath: AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
			subpath: buildKnowledgeVolumeSubpath(projectId, agentId),
		};
	}

	private assertValidPathSegments(projectId: string, agentId: string): void {
		try {
			assertKnowledgePathSegment(projectId, 'project id');
			assertKnowledgePathSegment(agentId, 'agent id');
		} catch (error) {
			throw new OperationalError(
				error instanceof Error ? error.message : 'Invalid agent knowledge storage scope',
			);
		}
	}

	private assertKnowledgeSandboxEnabled(): void {
		if (
			this.agentsConfig.sandboxEnabled !== true ||
			this.agentsConfig.sandboxProvider !== 'daytona'
		) {
			throw new OperationalError('Agent knowledge sandbox is not enabled');
		}
	}

	private assertKnowledgeVolumeConfigured(): void {
		if (!this.agentsConfig.daytonaVolumeId.trim()) {
			throw new OperationalError('Agent knowledge Daytona volume is not configured');
		}
	}
}
