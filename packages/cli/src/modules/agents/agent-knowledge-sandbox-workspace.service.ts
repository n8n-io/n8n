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
	KnowledgeSandboxRequiredFile,
} from './agent-knowledge.service';
import { AgentKnowledgeService } from './agent-knowledge.service';

const MAX_CONCURRENT_KNOWLEDGE_SANDBOX_WORKSPACES = 4;
const KNOWLEDGE_SANDBOX_WORKSPACE_CACHE_TTL_MS = 10 * 60_000;
const MAX_CACHED_KNOWLEDGE_SANDBOX_WORKSPACES = 25;
const KNOWLEDGE_SANDBOX_SUBDIR = 'agent-knowledge';
const KNOWLEDGE_SANDBOX_INTERNAL_SUBDIR = '.agent-knowledge-internal';
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
	corpusSignature?: string;
	volumeSubpath?: string;
}

interface CachedKnowledgeSandboxWorkspace {
	workspace: KnowledgeSandboxWorkspace;
	lastUsedAt: number;
}

export interface WithCachedWorkspaceOptions {
	userId: string;
	expectedManifest: KnowledgeSandboxExpectedManifest;
}

interface DaytonaKnowledgeWorkspaceMount {
	knowledgeRoot: string;
	internalRoot: string;
	manifestPath: string;
	corpusSignature: string;
	volumeSubpath: string;
	volumeMount: NonNullable<DaytonaSandboxConfig['volumes']>[number];
}

@Service()
export class AgentKnowledgeSandboxWorkspaceService {
	private readonly cachedWorkspaces = new Map<string, CachedKnowledgeSandboxWorkspace>();
	private readonly workspaceLocks = new Map<string, Promise<unknown>>();
	private readonly activeWorkspaceCounts = new Map<string, number>();

	constructor(
		private readonly logger: Logger,
		private readonly sandboxConfigService: AgentKnowledgeSandboxConfigService,
		private readonly knowledgeService: AgentKnowledgeService,
	) {}

	async ensureWorkspaceContainsFiles(
		workspace: KnowledgeSandboxWorkspace,
		requiredManifest: KnowledgeSandboxExpectedManifest,
		materialize: (missingFiles: KnowledgeSandboxRequiredFile[]) => Promise<void>,
	): Promise<void> {
		const actualManifest = await this.readWorkspaceManifest(workspace);
		if (
			actualManifest &&
			!this.knowledgeService.isSandboxManifestIdentityValid(actualManifest, requiredManifest)
		) {
			await this.clearStaleWorkspaceState(workspace);
			await materialize(requiredManifest.files.map(toRequiredFile));
			return;
		}

		if (!(await workspace.filesystem.exists(workspace.knowledgeRoot))) {
			await this.clearStaleWorkspaceState(workspace);
			await materialize(requiredManifest.files.map(toRequiredFile));
			return;
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
			requiredManifest,
		);

		if (missingFiles.length === 0) {
			return;
		}

		await materialize(missingFiles);
	}

	async withCachedWorkspace<T>(
		cacheKey: string,
		options: WithCachedWorkspaceOptions,
		operation: (workspace: KnowledgeSandboxWorkspace) => Promise<T>,
	): Promise<T> {
		const resolvedCacheKey = this.resolveWorkspaceCacheKey(cacheKey, options.expectedManifest);

		return await this.serializeByKey(
			resolvedCacheKey,
			async () =>
				await workspaceLimit(async () => {
					this.markWorkspaceActive(resolvedCacheKey);
					try {
						const entry = await this.ensureCachedWorkspace(resolvedCacheKey, cacheKey, options);
						entry.lastUsedAt = Date.now();
						return await operation(entry.workspace);
					} finally {
						this.markWorkspaceInactive(resolvedCacheKey);
					}
				}),
		);
	}

	@OnLeaderStepdown()
	@OnShutdown()
	async destroyAll(): Promise<void> {
		const entries = [...this.cachedWorkspaces.values()];
		this.cachedWorkspaces.clear();
		this.workspaceLocks.clear();
		this.activeWorkspaceCounts.clear();

		await Promise.all(
			entries.map(async (entry) => await this.destroySandbox(entry.workspace.sandbox)),
		);
	}

	getCachedWorkspaceCount(): number {
		return this.cachedWorkspaces.size;
	}

	async destroyCachedWorkspacesForAgent(projectId: string, agentId: string): Promise<void> {
		const prefix = `${projectId}:${agentId}:`;
		const keys = new Set(
			[...this.cachedWorkspaces.keys(), ...this.workspaceLocks.keys()].filter((key) =>
				key.startsWith(prefix),
			),
		);

		await Promise.all([...keys].map(async (key) => await this.destroyCachedWorkspace(key)));
	}

	/**
	 * Best-effort teardown after knowledge deletes. When this fails, previously
	 * materialized files can remain searchable via unscoped search until the
	 * workspace is evicted or recreated.
	 */
	async invalidateCachedWorkspacesForAgent(projectId: string, agentId: string): Promise<void> {
		try {
			await this.destroyCachedWorkspacesForAgent(projectId, agentId);
		} catch (error) {
			this.logger.warn('Failed to destroy cached agent knowledge workspaces', {
				projectId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
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

	private async destroyCachedWorkspace(cacheKey: string): Promise<void> {
		await this.serializeByKey(cacheKey, async () => {
			const entry = this.cachedWorkspaces.get(cacheKey);
			if (!entry) return;

			this.cachedWorkspaces.delete(cacheKey);
			await this.destroySandbox(entry.workspace.sandbox);
		});
	}

	private async ensureCachedWorkspace(
		cacheKey: string,
		identityCacheKey: string,
		options: WithCachedWorkspaceOptions,
	): Promise<CachedKnowledgeSandboxWorkspace> {
		const existing = this.cachedWorkspaces.get(cacheKey);
		const status = existing?.workspace.sandbox.status;
		if (existing && status !== 'destroyed' && status !== 'destroying') {
			return existing;
		}

		if (existing) {
			this.cachedWorkspaces.delete(cacheKey);
			await this.destroySandbox(existing.workspace.sandbox);
		}

		const baseConfig = await this.resolveSandboxConfig(options.userId);
		const workspace = await this.createKnowledgeSandboxWorkspace(
			identityCacheKey,
			baseConfig,
			options.expectedManifest,
		);
		const entry: CachedKnowledgeSandboxWorkspace = {
			workspace,
			lastUsedAt: Date.now(),
		};
		this.cachedWorkspaces.set(cacheKey, entry);
		await this.evictStaleWorkspaces();
		return entry;
	}

	private async createKnowledgeSandboxWorkspace(
		identityCacheKey: string,
		baseConfig: SandboxConfig,
		expectedManifest: KnowledgeSandboxExpectedManifest,
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

		const mount = this.buildDaytonaKnowledgeWorkspaceMount(identity, expectedManifest);
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
				corpusSignature: mount.corpusSignature,
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

	private buildDaytonaKnowledgeWorkspaceMount(
		identity: { projectId: string; agentId: string },
		expectedManifest: KnowledgeSandboxExpectedManifest,
	): DaytonaKnowledgeWorkspaceMount {
		const { volumeId, subpathPrefix } = this.sandboxConfigService.resolveDaytonaVolumeConfig();
		this.assertSafeVolumePathSegment('projectId', identity.projectId);
		this.assertSafeVolumePathSegment('agentId', identity.agentId);
		this.assertSafeVolumePathSegment('corpusSignature', expectedManifest.corpusSignature);

		const knowledgeRoot = path.join(DAYTONA_WORKSPACE_ROOT, KNOWLEDGE_SANDBOX_SUBDIR);
		const internalRoot = path.join(knowledgeRoot, KNOWLEDGE_SANDBOX_INTERNAL_SUBDIR);
		const manifestPath = path.join(internalRoot, 'manifest.json');
		const volumeSubpath = [
			subpathPrefix,
			'projects',
			identity.projectId,
			'agents',
			identity.agentId,
			'corpora',
			expectedManifest.corpusSignature,
		].join('/');

		return {
			knowledgeRoot,
			internalRoot,
			manifestPath,
			corpusSignature: expectedManifest.corpusSignature,
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

	private resolveWorkspaceCacheKey(
		cacheKey: string,
		expectedManifest: KnowledgeSandboxExpectedManifest,
	): string {
		return `${cacheKey}:corpus:${expectedManifest.corpusSignature}`;
	}

	private async resolveSandboxConfig(userId: string | undefined): Promise<SandboxConfig> {
		if (userId && this.sandboxConfigService.isDaytonaProxyEnabled()) {
			throw new OperationalError(AGENT_KNOWLEDGE_DAYTONA_PROXY_VOLUMES_UNSUPPORTED_MESSAGE);
		}

		return this.sandboxConfigService.resolveConfig();
	}

	private async evictStaleWorkspaces(): Promise<void> {
		const now = Date.now();
		const evictable: Array<[string, CachedKnowledgeSandboxWorkspace]> = [];
		const fresh: Array<[string, CachedKnowledgeSandboxWorkspace]> = [];

		for (const entry of this.cachedWorkspaces) {
			if (this.activeWorkspaceCounts.has(entry[0])) {
				fresh.push(entry);
				continue;
			}
			(now - entry[1].lastUsedAt > KNOWLEDGE_SANDBOX_WORKSPACE_CACHE_TTL_MS
				? evictable
				: fresh
			).push(entry);
		}

		if (fresh.length > MAX_CACHED_KNOWLEDGE_SANDBOX_WORKSPACES) {
			const inactiveFresh = fresh.filter(([key]) => !this.activeWorkspaceCounts.has(key));
			inactiveFresh.sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt);
			evictable.push(
				...inactiveFresh.slice(0, fresh.length - MAX_CACHED_KNOWLEDGE_SANDBOX_WORKSPACES),
			);
		}

		for (const [key, entry] of evictable) {
			this.cachedWorkspaces.delete(key);
			await this.destroySandbox(entry.workspace.sandbox);
		}
	}

	private markWorkspaceActive(cacheKey: string): void {
		this.activeWorkspaceCounts.set(cacheKey, (this.activeWorkspaceCounts.get(cacheKey) ?? 0) + 1);
	}

	private markWorkspaceInactive(cacheKey: string): void {
		const count = this.activeWorkspaceCounts.get(cacheKey);
		if (!count || count <= 1) {
			this.activeWorkspaceCounts.delete(cacheKey);
			return;
		}
		this.activeWorkspaceCounts.set(cacheKey, count - 1);
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

	private async clearStaleWorkspaceState(workspace: KnowledgeSandboxWorkspace): Promise<void> {
		if (workspace.storageMode === 'daytona-volume') {
			await this.clearDaytonaVolumeWorkspaceContents(workspace);
			return;
		}

		await this.deleteIfPresent(workspace, workspace.knowledgeRoot, {
			recursive: true,
			force: true,
		});
		await this.deleteIfPresent(workspace, workspace.manifestPath, { force: true });
		await workspace.filesystem.mkdir(workspace.knowledgeRoot, { recursive: true });
		await workspace.filesystem.mkdir(workspace.internalRoot, { recursive: true });
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

	private async deleteIfPresent(
		workspace: KnowledgeSandboxWorkspace,
		targetPath: string,
		options: { recursive?: boolean; force?: boolean },
	): Promise<void> {
		try {
			await workspace.filesystem.deleteFile(targetPath, options);
		} catch (error) {
			if (await workspace.filesystem.exists(targetPath)) {
				throw error;
			}
		}
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

function toRequiredFile(
	file: KnowledgeSandboxExpectedManifest['files'][number],
): KnowledgeSandboxRequiredFile {
	return {
		id: file.id,
		relativePath: file.relativePath,
		fileSizeBytes: file.fileSizeBytes,
	};
}
