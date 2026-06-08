import { Logger } from '@n8n/backend-common';
import {
	createFilesystem,
	createSandbox,
	DAYTONA_WORKSPACE_ROOT,
	type DaytonaSandboxConfig,
	type SandboxConfig,
	type SandboxFilesystem,
	type SandboxInstance,
	type SandboxProvider,
} from '@n8n/agents/sandbox';
import { OnLeaderStepdown, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import path from 'node:path/posix';
import { OperationalError } from 'n8n-workflow';
import pLimit from 'p-limit';

import {
	AGENT_KNOWLEDGE_DAYTONA_PROXY_VOLUMES_UNSUPPORTED_MESSAGE,
	AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE,
	AgentKnowledgeSandboxConfigService,
} from './agent-knowledge-sandbox-config.service';
import type {
	KnowledgeSandboxExpectedManifest,
	KnowledgeSandboxManifest,
} from './agent-knowledge.service';
import { AgentKnowledgeService } from './agent-knowledge.service';

const MAX_CONCURRENT_KNOWLEDGE_SANDBOX_WORKSPACES = 4;
const KNOWLEDGE_SANDBOX_SUBDIR = 'agent-knowledge';
const KNOWLEDGE_SANDBOX_INTERNAL_SUBDIR = '.agent-knowledge-internal';
const KNOWLEDGE_SANDBOX_AGENT_CLEANUP_SUBDIR = 'agent-knowledge-cleanup';
const SANDBOX_NAME_MAX_LEN = 63;
const SANDBOX_LABEL_MAX_LEN = 63;
const NAME_PREFIX_SLUG_MAX_LEN = 24;
const AGENTS_KNOWLEDGE_SANDBOX_BASE_NAME = 'agents-knowledgebase';

/** Bounds concurrent sandbox workspace usage; queued calls run in FIFO order. */
const workspaceLimit = pLimit(MAX_CONCURRENT_KNOWLEDGE_SANDBOX_WORKSPACES);

export interface KnowledgeSandboxWorkspace {
	sandbox: SandboxInstance;
	filesystem: SandboxFilesystem;
	provider: SandboxProvider;
	storageMode: 'sandbox-local' | 'daytona-volume';
	workspaceRoot: string;
	knowledgeRoot: string;
	internalRoot: string;
	manifestPath: string;
	volumeSubpath?: string;
}

export interface WithSyncedWorkspaceOptions {
	userId: string;
	expectedManifest: KnowledgeSandboxExpectedManifest;
}

interface DaytonaKnowledgeWorkspaceMount {
	knowledgeRoot: string;
	internalRoot: string;
	manifestPath: string;
	volumeSubpath: string;
	volumeMount: NonNullable<DaytonaSandboxConfig['volumes']>[number];
}

@Service()
export class AgentKnowledgeSandboxWorkspaceService {
	private readonly workspaceLocks = new Map<string, Promise<unknown>>();

	constructor(
		private readonly logger: Logger,
		private readonly sandboxConfigService: AgentKnowledgeSandboxConfigService,
		private readonly knowledgeService: AgentKnowledgeService,
	) {}

	async withSyncedWorkspace<T>(
		cacheKey: string,
		options: WithSyncedWorkspaceOptions,
		repair: (workspace: KnowledgeSandboxWorkspace) => Promise<void>,
		operation: (workspace: KnowledgeSandboxWorkspace) => Promise<T>,
	): Promise<T> {
		return await this.serializeByKey(
			cacheKey,
			async () =>
				await workspaceLimit(async () => {
					const workspace = await this.createKnowledgeSandboxWorkspace(
						cacheKey,
						await this.resolveSandboxConfig(options.userId),
					);
					try {
						if (await this.workspaceNeedsRepair(workspace, options.expectedManifest)) {
							await this.clearDaytonaVolumeWorkspaceContents(workspace);
							await repair(workspace);
						}
						return await operation(workspace);
					} finally {
						await this.destroySandbox(workspace.sandbox);
					}
				}),
		);
	}

	async syncDaytonaVolumeForAgent(
		projectId: string,
		agentId: string,
		userId: string | undefined,
		_expectedManifest: KnowledgeSandboxExpectedManifest,
		materializeAll: (workspace: KnowledgeSandboxWorkspace) => Promise<void>,
	): Promise<void> {
		if (!this.sandboxConfigService.isAvailable()) {
			this.logger.info('Skipping agent knowledge Daytona volume sync; sandbox is unavailable', {
				projectId,
				agentId,
			});
			return;
		}

		const cacheKey = buildAgentKnowledgeWorkspaceCacheKey(projectId, agentId);
		await this.serializeByKey(cacheKey, async () => {
			const workspace = await this.createKnowledgeSandboxWorkspace(
				cacheKey,
				await this.resolveSandboxConfig(userId),
			);
			try {
				this.logger.debug('Created agent knowledge Daytona sync sandbox', {
					projectId,
					agentId,
					sandboxId: workspace.sandbox.id,
					volumeSubpath: workspace.volumeSubpath,
				});
				await this.replaceWorkspaceContents(workspace, materializeAll);
				this.logger.info('Materialized agent knowledge Daytona volume', {
					projectId,
					agentId,
					volumeSubpath: workspace.volumeSubpath,
				});
			} finally {
				await this.destroySandbox(workspace.sandbox);
			}
		});
	}

	async syncAgentKnowledgeVolume(
		projectId: string,
		agentId: string,
		userId: string | undefined,
	): Promise<void> {
		if (!this.sandboxConfigService.isAvailable()) {
			this.logger.info('Skipping agent knowledge Daytona volume sync; sandbox is unavailable', {
				projectId,
				agentId,
			});
			return;
		}

		try {
			const startedAt = Date.now();
			const { storedFiles, expectedManifest } =
				await this.knowledgeService.resolveCurrentSandboxManifest(agentId, projectId);
			this.logger.info('Starting agent knowledge Daytona volume sync', {
				projectId,
				agentId,
				fileCount: storedFiles.length,
				totalBytes: storedFiles.reduce((total, file) => total + file.fileSizeBytes, 0),
				corpusSignature: expectedManifest.corpusSignature,
			});
			await this.syncDaytonaVolumeForAgent(
				projectId,
				agentId,
				userId,
				expectedManifest,
				async (workspace) => {
					await this.knowledgeService.materializeWorkspaceFilesIntoSandbox(
						agentId,
						projectId,
						workspace,
						expectedManifest,
						storedFiles,
					);
				},
			);
			this.logger.info('Completed agent knowledge Daytona volume sync', {
				projectId,
				agentId,
				fileCount: storedFiles.length,
				durationMs: Date.now() - startedAt,
				corpusSignature: expectedManifest.corpusSignature,
			});
		} catch (error) {
			this.logger.warn('Failed to sync agent knowledge Daytona volume', {
				projectId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async cleanupDaytonaVolumeForAgent(projectId: string, agentId: string): Promise<void> {
		if (!this.sandboxConfigService.isAvailable()) return;

		try {
			await this.deleteDaytonaVolumeAgentContents(projectId, agentId);
		} catch (error) {
			this.logger.warn('Failed to clean up Daytona agent knowledge volume contents', {
				projectId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	@OnLeaderStepdown()
	@OnShutdown()
	async destroyAll(): Promise<void> {
		this.workspaceLocks.clear();
	}

	/** Run `fn`s sharing a key strictly one at a time (FIFO). */
	private async serializeByKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
		const previous = this.workspaceLocks.get(key) ?? Promise.resolve();
		const run = previous.then(fn, fn);
		const tail = run.then(
			() => undefined,
			() => undefined,
		);
		this.workspaceLocks.set(key, tail);
		try {
			return await run;
		} finally {
			if (this.workspaceLocks.get(key) === tail) this.workspaceLocks.delete(key);
		}
	}

	private async createKnowledgeSandboxWorkspace(
		identityCacheKey: string,
		baseConfig: SandboxConfig,
	): Promise<KnowledgeSandboxWorkspace> {
		if (!baseConfig.enabled) {
			const sandbox = await createSandbox(baseConfig, { logger: this.logger });
			if (!sandbox) {
				throw new Error('Agent knowledge sandbox is disabled');
			}
			throw new Error('Agent knowledge sandbox is disabled');
		}

		if (baseConfig.provider !== 'daytona') {
			throw new OperationalError(AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE);
		}

		const identity = parseAgentWorkspaceCacheKey(identityCacheKey);
		if (!identity) {
			throw new Error('Failed to parse agent knowledge sandbox workspace cache key');
		}

		const mount = this.buildDaytonaKnowledgeWorkspaceMount(identity);
		const config = this.buildSandboxConfig(baseConfig, identity, mount);
		const sandbox = await createSandbox(config, { logger: this.logger });
		if (!sandbox) {
			throw new Error('Agent knowledge sandbox is disabled');
		}

		try {
			const filesystem = createFilesystem(sandbox);

			await filesystem.mkdir(mount.internalRoot, { recursive: true });

			return {
				sandbox,
				filesystem,
				provider: 'daytona',
				storageMode: 'daytona-volume',
				workspaceRoot: DAYTONA_WORKSPACE_ROOT,
				knowledgeRoot: mount.knowledgeRoot,
				internalRoot: mount.internalRoot,
				manifestPath: mount.manifestPath,
				volumeSubpath: mount.volumeSubpath,
			};
		} catch (error) {
			await this.destroySandbox(sandbox);
			throw error;
		}
	}

	private buildSandboxConfig(
		baseConfig: DaytonaSandboxConfig,
		identity: { projectId: string; agentId: string },
		mount: DaytonaKnowledgeWorkspaceMount,
	): DaytonaSandboxConfig {
		const namePrefix = this.sandboxConfigService.resolveNamePrefix();
		const name = baseConfig.name ?? buildAgentsKnowledgeSandboxName(namePrefix);
		return {
			...baseConfig,
			id: name,
			name,
			labels: {
				...buildAgentsKnowledgeSandboxLabels(identity, namePrefix),
				...baseConfig.labels,
			},
			volumes: [mount.volumeMount],
		};
	}

	private buildDaytonaKnowledgeWorkspaceMount(identity: {
		projectId: string;
		agentId: string;
	}): DaytonaKnowledgeWorkspaceMount {
		const { volumeId, subpathPrefix } = this.sandboxConfigService.resolveDaytonaVolumeConfig();
		this.assertSafeVolumePathSegment('projectId', identity.projectId);
		this.assertSafeVolumePathSegment('agentId', identity.agentId);

		const knowledgeRoot = path.join(DAYTONA_WORKSPACE_ROOT, KNOWLEDGE_SANDBOX_SUBDIR);
		const internalRoot = path.join(knowledgeRoot, KNOWLEDGE_SANDBOX_INTERNAL_SUBDIR);
		const manifestPath = path.join(internalRoot, 'manifest.json');
		const volumeSubpath = [
			subpathPrefix,
			'projects',
			identity.projectId,
			'agents',
			identity.agentId,
			'knowledge',
		].join('/');

		return {
			knowledgeRoot,
			internalRoot,
			manifestPath,
			volumeSubpath,
			volumeMount: {
				volumeId,
				mountPath: knowledgeRoot,
				subpath: volumeSubpath,
			},
		};
	}

	private assertSafeVolumePathSegment(name: string, value: string): void {
		if (
			value.length === 0 ||
			value === '.' ||
			value === '..' ||
			value.includes('/') ||
			value.includes('\\') ||
			this.hasControlCharacters(value)
		) {
			throw new OperationalError(
				`Invalid Daytona volume subpath segment for agent knowledge base: ${name}`,
			);
		}
	}

	private hasControlCharacters(value: string): boolean {
		for (const character of value) {
			const code = character.charCodeAt(0);
			if (code <= 0x1f || code === 0x7f) return true;
		}
		return false;
	}

	private async resolveSandboxConfig(userId: string | undefined): Promise<SandboxConfig> {
		if (userId && this.sandboxConfigService.isDaytonaProxyEnabled()) {
			throw new OperationalError(AGENT_KNOWLEDGE_DAYTONA_PROXY_VOLUMES_UNSUPPORTED_MESSAGE);
		}

		return this.sandboxConfigService.resolveConfig();
	}

	private async readWorkspaceManifest(
		workspace: KnowledgeSandboxWorkspace,
	): Promise<KnowledgeSandboxManifest | null> {
		try {
			const rawContent = await workspace.filesystem.readFile(workspace.manifestPath);
			return this.knowledgeService.parseSandboxManifest(
				JSON.parse(this.normalizeFileContent(rawContent)),
			);
		} catch {
			return null;
		}
	}

	private async clearDaytonaVolumeWorkspaceContents(
		workspace: KnowledgeSandboxWorkspace,
	): Promise<void> {
		const entries = await workspace.filesystem.readdir(workspace.knowledgeRoot);

		await Promise.all(
			entries.map(async (entry) => {
				const childPath = path.join(workspace.knowledgeRoot, entry.name);
				await this.deleteIfPresent(workspace, childPath, { recursive: true, force: true });
			}),
		);

		await workspace.filesystem.mkdir(workspace.internalRoot, { recursive: true });
	}

	private async replaceWorkspaceContents(
		workspace: KnowledgeSandboxWorkspace,
		materializeAll: (workspace: KnowledgeSandboxWorkspace) => Promise<void>,
	): Promise<void> {
		await this.clearDaytonaVolumeWorkspaceContents(workspace);
		await materializeAll(workspace);
	}

	private async workspaceNeedsRepair(
		workspace: KnowledgeSandboxWorkspace,
		expectedManifest: KnowledgeSandboxExpectedManifest,
	): Promise<boolean> {
		const actualManifest = await this.readWorkspaceManifest(workspace);
		if (!actualManifest) return true;
		if (!this.knowledgeService.isSandboxManifestIdentityValid(actualManifest, expectedManifest)) {
			return true;
		}
		const missingFiles = await this.knowledgeService.findRequiredFilesNeedingMaterialization(
			{
				sandbox: workspace.sandbox,
				filesystem: workspace.filesystem,
				storageMode: workspace.storageMode,
				knowledgeRoot: workspace.knowledgeRoot,
				internalRoot: workspace.internalRoot,
				manifestPath: workspace.manifestPath,
			},
			actualManifest,
			expectedManifest,
		);
		return missingFiles.length > 0;
	}

	private async deleteDaytonaVolumeAgentContents(
		projectId: string,
		agentId: string,
	): Promise<void> {
		const baseConfig = this.sandboxConfigService.resolveConfig();
		if (!baseConfig.enabled || baseConfig.provider !== 'daytona') return;
		if (this.sandboxConfigService.isDaytonaProxyEnabled()) return;

		this.assertSafeVolumePathSegment('projectId', projectId);
		this.assertSafeVolumePathSegment('agentId', agentId);

		const { volumeId, subpathPrefix } = this.sandboxConfigService.resolveDaytonaVolumeConfig();
		const cleanupRoot = path.join(DAYTONA_WORKSPACE_ROOT, KNOWLEDGE_SANDBOX_AGENT_CLEANUP_SUBDIR);
		const agentVolumeSubpath = [subpathPrefix, 'projects', projectId, 'agents', agentId].join('/');
		const namePrefix = this.sandboxConfigService.resolveNamePrefix();
		const name = baseConfig.name ?? buildAgentsKnowledgeSandboxName(namePrefix);

		const sandbox = await createSandbox(
			{
				...baseConfig,
				id: name,
				name,
				labels: {
					...buildAgentsKnowledgeSandboxLabels({ projectId, agentId }, namePrefix),
					...baseConfig.labels,
					cleanup: 'agent-volume',
				},
				volumes: [
					{
						volumeId,
						mountPath: cleanupRoot,
						subpath: agentVolumeSubpath,
					},
				],
			},
			{ logger: this.logger },
		);
		if (!sandbox) return;

		try {
			const filesystem = createFilesystem(sandbox);
			if (!(await filesystem.exists(cleanupRoot))) return;

			const entries = await filesystem.readdir(cleanupRoot);
			await Promise.all(
				entries.map(async (entry) => {
					const childPath = path.join(cleanupRoot, entry.name);
					await this.deleteFilesystemPathIfPresent(filesystem, childPath, {
						recursive: true,
						force: true,
					});
				}),
			);
		} finally {
			await this.destroySandbox(sandbox);
		}
	}

	private async deleteFilesystemPathIfPresent(
		filesystem: SandboxFilesystem,
		targetPath: string,
		options: { recursive?: boolean; force?: boolean },
	): Promise<void> {
		try {
			await filesystem.deleteFile(targetPath, options);
		} catch (error) {
			if (await filesystem.exists(targetPath)) {
				throw error;
			}
		}
	}

	private async deleteIfPresent(
		workspace: KnowledgeSandboxWorkspace,
		targetPath: string,
		options: { recursive?: boolean; force?: boolean },
	): Promise<void> {
		await this.deleteFilesystemPathIfPresent(workspace.filesystem, targetPath, options);
	}

	private normalizeFileContent(content: unknown): string {
		if (typeof content === 'string') return content;
		if (Buffer.isBuffer(content)) return content.toString('utf8');
		if (content && typeof content === 'object' && 'content' in content) {
			const value = (content as { content?: unknown }).content;
			if (typeof value === 'string') return value;
			if (Buffer.isBuffer(value)) return value.toString('utf8');
		}
		return String(content);
	}

	private async destroySandbox(sandbox: SandboxInstance): Promise<void> {
		try {
			if (sandbox._destroy) {
				await sandbox._destroy();
				return;
			}
			if (sandbox.destroy) {
				await sandbox.destroy();
			}
		} catch (error) {
			this.logger.warn('Failed to destroy agent knowledge sandbox workspace', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

function slugifySandboxName(value: string, maxLen: number): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug.slice(0, maxLen).replace(/-+$/, '');
}

function slugifySandboxLabel(value: string, maxLen: number): string {
	return value
		.replace(/[^A-Za-z0-9_.-]+/g, '-')
		.replace(/^[-.]+|[-.]+$/g, '')
		.slice(0, maxLen)
		.replace(/[-.]+$/, '');
}

function buildAgentsKnowledgeSandboxName(namePrefix: string | undefined): string {
	const parts: string[] = [];
	if (namePrefix) {
		const prefixSlug = slugifySandboxName(namePrefix, NAME_PREFIX_SLUG_MAX_LEN);
		if (prefixSlug) parts.push(prefixSlug);
	}
	const baseSlug = slugifySandboxName(
		`${AGENTS_KNOWLEDGE_SANDBOX_BASE_NAME}-${randomUUID()}`,
		SANDBOX_NAME_MAX_LEN,
	);
	if (baseSlug) parts.push(baseSlug);
	const name = slugifySandboxName(parts.join('-'), SANDBOX_NAME_MAX_LEN);
	if (!name) {
		throw new Error('Failed to build agent knowledge sandbox name');
	}
	return name;
}

function parseAgentWorkspaceCacheKey(
	cacheKey: string,
): { projectId: string; agentId: string } | undefined {
	const separatorIndex = cacheKey.lastIndexOf(':');
	if (separatorIndex === -1) return undefined;
	const remainder = cacheKey.slice(0, separatorIndex);
	const agentSeparatorIndex = remainder.lastIndexOf(':');
	if (agentSeparatorIndex === -1) return undefined;
	return {
		projectId: remainder.slice(0, agentSeparatorIndex),
		agentId: remainder.slice(agentSeparatorIndex + 1),
	};
}

function buildAgentsKnowledgeSandboxLabels(
	identity: { projectId: string; agentId: string } | undefined,
	namePrefix: string | undefined,
): Record<string, string> {
	const labels: Record<string, string> = {
		component: 'agent-knowledge',
	};
	if (identity) {
		labels.agent_id = slugifySandboxLabel(identity.agentId, SANDBOX_LABEL_MAX_LEN);
		labels.project_id = slugifySandboxLabel(identity.projectId, SANDBOX_LABEL_MAX_LEN);
	}
	if (namePrefix) {
		labels.name_prefix = slugifySandboxLabel(namePrefix, SANDBOX_LABEL_MAX_LEN);
	}
	return labels;
}

function buildAgentKnowledgeWorkspaceCacheKey(projectId: string, agentId: string): string {
	return `${projectId}:${agentId}:workspace`;
}
