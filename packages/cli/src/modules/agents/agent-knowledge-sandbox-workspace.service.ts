import { Logger } from '@n8n/backend-common';
import {
	createFilesystem,
	createSandbox,
	DAYTONA_WORKSPACE_ROOT,
	N8N_SANDBOX_WORKSPACE_ROOT,
	type SandboxConfig,
	type SandboxFilesystem,
	type SandboxInstance,
	type SandboxProvider,
} from '@n8n/ai-utilities/sandbox';
import { OnLeaderStepdown, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import path from 'node:path/posix';
import pLimit from 'p-limit';

import { AgentKnowledgeSandboxConfigService } from './agent-knowledge-sandbox-config.service';
import type {
	KnowledgeSandboxExpectedManifest,
	KnowledgeSandboxManifest,
	KnowledgeWorkspaceFile,
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
	workspaceRoot: string;
	knowledgeRoot: string;
	internalRoot: string;
	manifestPath: string;
}

export type KnowledgeWorkspaceFreshness = { status: 'fresh' } | { status: 'stale'; reason: string };

interface CachedKnowledgeSandboxWorkspace {
	workspace: KnowledgeSandboxWorkspace;
	lastUsedAt: number;
}

@Service()
export class AgentKnowledgeSandboxWorkspaceService {
	private readonly cachedWorkspaces = new Map<string, CachedKnowledgeSandboxWorkspace>();
	private readonly workspaceLocks = new Map<string, Promise<unknown>>();

	constructor(
		private readonly logger: Logger,
		private readonly sandboxConfigService: AgentKnowledgeSandboxConfigService,
		private readonly knowledgeService: AgentKnowledgeService,
	) {}

	async ensureWorkspaceMaterialized(
		workspace: KnowledgeSandboxWorkspace,
		expectedManifest: KnowledgeSandboxExpectedManifest,
		materialize: () => Promise<KnowledgeWorkspaceFile[]>,
	): Promise<{
		files: KnowledgeWorkspaceFile[] | undefined;
		freshness: KnowledgeWorkspaceFreshness;
	}> {
		return await this.ensureWorkspaceContainsFiles(
			workspace,
			expectedManifest,
			async () => await materialize(),
		);
	}

	async ensureWorkspaceContainsFiles(
		workspace: KnowledgeSandboxWorkspace,
		requiredManifest: KnowledgeSandboxExpectedManifest,
		materialize: (missingFiles: KnowledgeWorkspaceFile[]) => Promise<KnowledgeWorkspaceFile[]>,
	): Promise<{
		files: KnowledgeWorkspaceFile[] | undefined;
		freshness: KnowledgeWorkspaceFreshness;
	}> {
		const actualManifest = await this.readWorkspaceManifest(workspace);
		if (
			actualManifest &&
			!this.knowledgeService.isSandboxManifestIdentityValid(actualManifest, requiredManifest)
		) {
			await this.clearStaleWorkspaceState(workspace);
			const files = await materialize(
				requiredManifest.files.map((file) => ({
					id: file.id,
					fileName: '',
					mimeType: '',
					fileSizeBytes: file.fileSizeBytes,
					relativePath: file.relativePath,
				})),
			);
			return { files, freshness: { status: 'stale', reason: 'manifest-identity' } };
		}

		if (!(await workspace.filesystem.exists(workspace.knowledgeRoot))) {
			await this.clearStaleWorkspaceState(workspace);
			const files = await materialize(
				requiredManifest.files.map((file) => ({
					id: file.id,
					fileName: '',
					mimeType: '',
					fileSizeBytes: file.fileSizeBytes,
					relativePath: file.relativePath,
				})),
			);
			return { files, freshness: { status: 'stale', reason: 'knowledge-root-missing' } };
		}

		const missingFiles = await this.knowledgeService.findRequiredFilesNeedingMaterialization(
			{
				sandbox: workspace.sandbox,
				filesystem: workspace.filesystem,
				knowledgeRoot: workspace.knowledgeRoot,
				internalRoot: workspace.internalRoot,
				manifestPath: workspace.manifestPath,
			},
			actualManifest,
			requiredManifest,
		);

		if (missingFiles.length === 0) {
			return { files: undefined, freshness: { status: 'fresh' } };
		}

		const files = await materialize(missingFiles);
		return { files, freshness: { status: 'stale', reason: 'missing-required-files' } };
	}

	async withCachedWorkspace<T>(
		cacheKey: string,
		operation: (workspace: KnowledgeSandboxWorkspace) => Promise<T>,
	): Promise<T> {
		return await this.serializeByKey(
			cacheKey,
			async () =>
				await workspaceLimit(async () => {
					const entry = await this.ensureCachedWorkspace(cacheKey);
					entry.lastUsedAt = Date.now();
					return await operation(entry.workspace);
				}),
		);
	}

	@OnLeaderStepdown()
	@OnShutdown()
	async destroyAll(): Promise<void> {
		const entries = [...this.cachedWorkspaces.values()];
		this.cachedWorkspaces.clear();
		this.workspaceLocks.clear();

		await Promise.all(entries.map(async (entry) => await this.destroyWorkspace(entry.workspace)));
	}

	getCachedWorkspaceCount(): number {
		return this.cachedWorkspaces.size;
	}

	async destroyCachedWorkspacesForAgent(projectId: string, agentId: string): Promise<void> {
		const prefix = `${projectId}:${agentId}:`;
		const toDestroy: Array<[string, CachedKnowledgeSandboxWorkspace]> = [];

		for (const entry of this.cachedWorkspaces) {
			if (entry[0].startsWith(prefix)) {
				toDestroy.push(entry);
			}
		}

		for (const [key] of toDestroy) {
			this.cachedWorkspaces.delete(key);
			this.workspaceLocks.delete(key);
		}

		await Promise.all(
			toDestroy.map(async ([, entry]) => await this.destroyWorkspace(entry.workspace)),
		);
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

	private async ensureCachedWorkspace(cacheKey: string): Promise<CachedKnowledgeSandboxWorkspace> {
		const existing = this.cachedWorkspaces.get(cacheKey);
		if (existing && this.isWorkspaceHealthy(existing.workspace)) {
			return existing;
		}

		if (existing) {
			this.cachedWorkspaces.delete(cacheKey);
			await this.destroyWorkspace(existing.workspace);
		}

		const workspace = await this.createKnowledgeSandboxWorkspace(cacheKey);
		const entry: CachedKnowledgeSandboxWorkspace = {
			workspace,
			lastUsedAt: Date.now(),
		};
		this.cachedWorkspaces.set(cacheKey, entry);
		await this.evictStaleWorkspaces();
		return entry;
	}

	private isWorkspaceHealthy(workspace: KnowledgeSandboxWorkspace): boolean {
		const status = workspace.sandbox.status;
		return status !== 'destroyed' && status !== 'destroying';
	}

	private async createKnowledgeSandboxWorkspace(
		cacheKey: string,
	): Promise<KnowledgeSandboxWorkspace> {
		const config = await this.buildSandboxConfig(
			this.sandboxConfigService.resolveConfig(),
			cacheKey,
		);
		const sandbox = await createSandbox(config, { logger: this.logger });
		if (!sandbox) {
			throw new Error('Agent knowledge sandbox is disabled');
		}

		try {
			const filesystem = createFilesystem(sandbox);
			const provider = config.provider;
			const workspaceRoot =
				provider === 'daytona' ? DAYTONA_WORKSPACE_ROOT : N8N_SANDBOX_WORKSPACE_ROOT;
			const knowledgeRoot = path.join(workspaceRoot, KNOWLEDGE_SANDBOX_SUBDIR);
			const internalRoot = path.join(workspaceRoot, KNOWLEDGE_SANDBOX_INTERNAL_SUBDIR);
			const manifestPath = path.join(internalRoot, 'manifest.json');

			await filesystem.mkdir(knowledgeRoot, { recursive: true });
			await filesystem.mkdir(internalRoot, { recursive: true });

			return {
				sandbox,
				filesystem,
				provider,
				workspaceRoot,
				knowledgeRoot,
				internalRoot,
				manifestPath,
			};
		} catch (error) {
			await this.destroySandbox(sandbox);
			throw error;
		}
	}

	private async buildSandboxConfig(
		baseConfig: SandboxConfig,
		cacheKey: string,
	): Promise<SandboxConfig> {
		if (!baseConfig.enabled) {
			return baseConfig;
		}

		if (baseConfig.provider === 'daytona') {
			const identity = parseAgentWorkspaceCacheKey(cacheKey);
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
			};
		}

		return baseConfig;
	}

	private async evictStaleWorkspaces(): Promise<void> {
		const now = Date.now();
		const evictable: Array<[string, CachedKnowledgeSandboxWorkspace]> = [];
		const fresh: Array<[string, CachedKnowledgeSandboxWorkspace]> = [];

		for (const entry of this.cachedWorkspaces) {
			(now - entry[1].lastUsedAt > KNOWLEDGE_SANDBOX_WORKSPACE_CACHE_TTL_MS
				? evictable
				: fresh
			).push(entry);
		}

		if (fresh.length > MAX_CACHED_KNOWLEDGE_SANDBOX_WORKSPACES) {
			fresh.sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt);
			evictable.push(...fresh.slice(0, fresh.length - MAX_CACHED_KNOWLEDGE_SANDBOX_WORKSPACES));
		}

		for (const [key, entry] of evictable) {
			this.cachedWorkspaces.delete(key);
			await this.destroyWorkspace(entry.workspace);
		}
	}

	private async destroyWorkspace(workspace: KnowledgeSandboxWorkspace): Promise<void> {
		await this.destroySandbox(workspace.sandbox);
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
		await this.deleteIfPresent(workspace, workspace.knowledgeRoot, {
			recursive: true,
			force: true,
		});
		await this.deleteIfPresent(workspace, workspace.manifestPath, { force: true });
		await workspace.filesystem.mkdir(workspace.knowledgeRoot, { recursive: true });
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

function getAgentsKnowledgeSandboxBaseName(): string {
	return `${AGENTS_KNOWLEDGE_SANDBOX_BASE_NAME}-${randomUUID()}`;
}

function buildAgentsKnowledgeSandboxName(namePrefix: string | undefined): string {
	const parts: string[] = [];
	if (namePrefix) {
		const prefixSlug = slugifySandboxName(namePrefix, NAME_PREFIX_SLUG_MAX_LEN);
		if (prefixSlug) parts.push(prefixSlug);
	}
	const baseSlug = slugifySandboxName(getAgentsKnowledgeSandboxBaseName(), SANDBOX_NAME_MAX_LEN);
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
