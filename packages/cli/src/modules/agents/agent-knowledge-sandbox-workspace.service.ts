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
import { Service } from '@n8n/di';
import { createHash } from 'node:crypto';
import path from 'node:path/posix';
import pLimit from 'p-limit';

import { AgentKnowledgeSandboxConfigService } from './agent-knowledge-sandbox-config.service';
import type {
	KnowledgeSandboxExpectedManifest,
	KnowledgeWorkspaceFile,
} from './agent-knowledge.service';
import { AgentKnowledgeService } from './agent-knowledge.service';

const MAX_CONCURRENT_KNOWLEDGE_SANDBOX_WORKSPACES = 4;
const KNOWLEDGE_SANDBOX_WORKSPACE_CACHE_TTL_MS = 10 * 60_000;
const MAX_CACHED_KNOWLEDGE_SANDBOX_WORKSPACES = 25;
const KNOWLEDGE_SANDBOX_SUBDIR = 'agent-knowledge';
const KNOWLEDGE_SANDBOX_INTERNAL_SUBDIR = '.agent-knowledge-internal';

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
		const freshness = await this.checkWorkspaceFreshness(workspace, expectedManifest);
		if (freshness.status === 'fresh') {
			return { files: undefined, freshness };
		}

		await this.clearStaleWorkspaceState(workspace);
		const files = await materialize();
		return { files, freshness };
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

	async destroyAll(): Promise<void> {
		const entries = [...this.cachedWorkspaces.values()];
		this.cachedWorkspaces.clear();
		this.workspaceLocks.clear();

		await Promise.all(entries.map(async (entry) => await this.destroyWorkspace(entry.workspace)));
	}

	getCachedWorkspaceCount(): number {
		return this.cachedWorkspaces.size;
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
			return {
				...baseConfig,
				name: baseConfig.name ?? this.buildDaytonaSandboxName(cacheKey),
				labels: {
					...baseConfig.labels,
					component: 'agent-knowledge',
				},
			};
		}

		return baseConfig;
	}

	private shortHash(cacheKey: string): string {
		return createHash('sha1').update(cacheKey).digest('hex').slice(0, 12);
	}

	private buildDaytonaSandboxName(cacheKey: string): string {
		return `knowledge-${this.shortHash(cacheKey)}-${this.shortHash(`${Date.now()}:${Math.random()}`)}`;
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

	private async checkWorkspaceFreshness(
		workspace: KnowledgeSandboxWorkspace,
		expected: KnowledgeSandboxExpectedManifest,
	): Promise<KnowledgeWorkspaceFreshness> {
		let rawContent: unknown;
		try {
			rawContent = await workspace.filesystem.readFile(workspace.manifestPath);
		} catch {
			return { status: 'stale', reason: 'manifest-missing' };
		}

		const content = this.normalizeFileContent(rawContent);
		let parsed: unknown;
		try {
			parsed = JSON.parse(content);
		} catch {
			return { status: 'stale', reason: 'manifest-invalid-json' };
		}

		if (!parsed || typeof parsed !== 'object') {
			return { status: 'stale', reason: 'manifest-invalid' };
		}

		const manifest = parsed as Record<string, unknown>;
		if (manifest.version !== expected.version) {
			return { status: 'stale', reason: 'manifest-version' };
		}
		if (manifest.agentId !== expected.agentId) {
			return { status: 'stale', reason: 'manifest-agent' };
		}
		if (manifest.projectId !== expected.projectId) {
			return { status: 'stale', reason: 'manifest-project' };
		}
		if (manifest.cacheSignatureSha1 !== expected.cacheSignatureSha1) {
			return { status: 'stale', reason: 'manifest-cache-signature' };
		}
		if (!Array.isArray(manifest.files)) {
			return { status: 'stale', reason: 'manifest-files' };
		}

		if (!this.knowledgeService.isSandboxManifestFresh(parsed, expected)) {
			return { status: 'stale', reason: 'manifest-files-mismatch' };
		}

		if (!(await workspace.filesystem.exists(workspace.knowledgeRoot))) {
			return { status: 'stale', reason: 'knowledge-root-missing' };
		}

		return { status: 'fresh' };
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
