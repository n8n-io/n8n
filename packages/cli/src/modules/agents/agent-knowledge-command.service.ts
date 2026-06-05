import { Service } from '@n8n/di';
import { spawn } from 'node:child_process';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pLimit from 'p-limit';

const MAX_OUTPUT_BYTES = 64 * 1024;
const COMMAND_TIMEOUT_MS = 5_000;
/**
 * Cap concurrent knowledge workspaces per process. Each workspace reads files
 * off the binary store and spawns a child process, so unbounded concurrency
 * could saturate CPU/disk on a shared (multi-tenant) host.
 */
const MAX_CONCURRENT_WORKSPACES = 4;
/** Evict a cached workspace after this much idle time. */
const WORKSPACE_CACHE_TTL_MS = 10 * 60_000;
/** Hard cap on retained workspaces to bound temp-dir disk usage. */
const MAX_CACHED_WORKSPACES = 25;
export const AGENT_KNOWLEDGE_COMMANDS = ['git_grep', 'cat', 'sed'] as const;

/** Bounds concurrent workspace usage; queued calls run in FIFO order. */
const workspaceLimit = pLimit(MAX_CONCURRENT_WORKSPACES);

interface CachedWorkspace {
	root: string;
	lastUsedAt: number;
}

export type AgentKnowledgeCommand = (typeof AGENT_KNOWLEDGE_COMMANDS)[number];

export type AgentKnowledgeCommandRequest =
	| {
			command: 'git_grep';
			pattern: string;
			outputMode?: 'count';
			caseInsensitive?: boolean;
			fixedStrings?: boolean;
			context?: number;
			files?: string[];
	  }
	| {
			command: 'cat';
			file: string;
	  }
	| {
			command: 'sed';
			file: string;
			startLine: number;
			endLine: number;
	  };

export interface AgentKnowledgeCommandResult {
	command: AgentKnowledgeCommand;
	exitCode: number | null;
	stdout: string;
	stderr: string;
	truncated: boolean;
}

type SafePathOptions = { allowRoot?: boolean };

@Service()
export class AgentKnowledgeCommandService {
	private readonly cachedWorkspaces = new Map<string, CachedWorkspace>();
	private readonly workspaceLocks = new Map<string, Promise<unknown>>();

	async run(workspaceRoot: string, request: AgentKnowledgeCommandRequest) {
		const root = await realpath(workspaceRoot);
		const { executable, args } = await this.toSpawnArgs(root, request);
		return await this.spawnCommand(root, executable, args, request.command);
	}

	/**
	 * Runs an operation against a materialized workspace, reusing it across
	 * calls keyed by `cacheKey` (which must encode the agent + exact file set +
	 * content). Calls for the same key are serialized so the shared directory is
	 * never materialized or read concurrently; idle workspaces are evicted by
	 * TTL/LRU rather than per call. This avoids re-writing the whole knowledge
	 * base to disk on every tool call within a conversation.
	 */
	async withCachedWorkspace<T>(
		cacheKey: string,
		materialize: (workspaceRoot: string) => Promise<void>,
		operation: (workspaceRoot: string) => Promise<T>,
	): Promise<T> {
		return await this.serializeByKey(
			cacheKey,
			async () =>
				await workspaceLimit(async () => {
					const workspaceRoot = await this.ensureCachedWorkspace(cacheKey, materialize);
					return await operation(workspaceRoot);
				}),
		);
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

	private async ensureCachedWorkspace(
		cacheKey: string,
		materialize: (workspaceRoot: string) => Promise<void>,
	): Promise<string> {
		const existing = this.cachedWorkspaces.get(cacheKey);
		if (existing && (await this.directoryExists(existing.root))) {
			existing.lastUsedAt = Date.now();
			return existing.root;
		}
		if (existing) this.cachedWorkspaces.delete(cacheKey);

		const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'n8n-agent-knowledge-'));
		try {
			await materialize(workspaceRoot);
		} catch (error) {
			await rm(workspaceRoot, { recursive: true, force: true }).catch(() => {});
			throw error;
		}
		this.cachedWorkspaces.set(cacheKey, { root: workspaceRoot, lastUsedAt: Date.now() });
		await this.evictStaleWorkspaces();
		return workspaceRoot;
	}

	private async evictStaleWorkspaces() {
		const now = Date.now();
		const evictable: Array<[string, CachedWorkspace]> = [];
		const fresh: Array<[string, CachedWorkspace]> = [];
		for (const entry of this.cachedWorkspaces) {
			(now - entry[1].lastUsedAt > WORKSPACE_CACHE_TTL_MS ? evictable : fresh).push(entry);
		}
		if (fresh.length > MAX_CACHED_WORKSPACES) {
			fresh.sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt);
			evictable.push(...fresh.slice(0, fresh.length - MAX_CACHED_WORKSPACES));
		}
		for (const [key, workspace] of evictable) {
			this.cachedWorkspaces.delete(key);
			await rm(workspace.root, { recursive: true, force: true }).catch(() => {});
		}
	}

	private async directoryExists(directory: string) {
		try {
			await realpath(directory);
			return true;
		} catch {
			return false;
		}
	}

	private async toSpawnArgs(
		root: string,
		request: AgentKnowledgeCommandRequest,
	): Promise<{ executable: string; args: string[] }> {
		switch (request.command) {
			case 'git_grep': {
				if (request.pattern.trim() === '') throw new Error('Search pattern is required');
				const args = ['grep', '--no-index', '-n', '-I'];
				if (request.caseInsensitive) args.push('-i');
				if (request.fixedStrings) args.push('-F');
				if (request.fixedStrings === false) args.push('-E');
				if (request.outputMode === 'count') args.push('-c');
				if (request.context !== undefined) {
					args.push('-C', String(Math.min(Math.max(request.context, 0), 5)));
				}
				args.push('--', request.pattern);
				const files = await Promise.all(
					(request.files ?? ['.']).map(
						async (file) => await this.safePath(root, file, { allowRoot: true }),
					),
				);
				args.push(...files.map((file) => path.relative(root, file) || '.'));
				return { executable: 'git', args };
			}
			case 'cat': {
				const file = await this.safePath(root, request.file);
				return { executable: 'cat', args: [path.relative(root, file)] };
			}
			case 'sed': {
				const file = await this.safePath(root, request.file);
				const startLine = Math.max(1, request.startLine);
				const endLine = Math.max(startLine, request.endLine);
				return {
					executable: 'sed',
					args: [
						'-n',
						`${startLine},${Math.min(endLine, startLine + 500)}p`,
						path.relative(root, file),
					],
				};
			}
		}
	}

	private async safePath(root: string, requestedPath: string, options: SafePathOptions = {}) {
		if (this.hasControlCharacters(requestedPath)) throw new Error('Invalid path');
		if (path.isAbsolute(requestedPath)) throw new Error('Absolute paths are not allowed');
		if (requestedPath.split(/[\\/]/).includes('..')) {
			throw new Error('Parent path segments are not allowed');
		}
		const resolved = path.resolve(root, requestedPath);
		const actual = await realpath(resolved);
		const relative = path.relative(root, actual);
		if (
			(!options.allowRoot && relative === '') ||
			relative.startsWith('..') ||
			path.isAbsolute(relative)
		) {
			throw new Error('Path escapes the knowledge workspace');
		}
		return actual;
	}

	private hasControlCharacters(value: string) {
		for (const character of value) {
			const code = character.charCodeAt(0);
			if (code <= 0x1f || code === 0x7f) return true;
		}
		return false;
	}

	private async spawnCommand(
		cwd: string,
		executable: string,
		args: string[],
		command: AgentKnowledgeCommand,
	): Promise<AgentKnowledgeCommandResult> {
		return await new Promise((resolve, reject) => {
			const child = spawn(executable, args, {
				cwd,
				shell: false,
				// Minimal env: PATH so the allow-listed binaries resolve, plus git
				// isolation so no host/user gitconfig or credential prompt can
				// influence `git grep`. No n8n secrets are exposed to the child.
				env: {
					PATH: process.env.PATH,
					HOME: cwd,
					GIT_CONFIG_NOSYSTEM: '1',
					GIT_CONFIG_GLOBAL: '/dev/null',
					GIT_TERMINAL_PROMPT: '0',
				},
			});
			let stdout = '';
			let stderr = '';
			let truncated = false;
			const timer = setTimeout(() => {
				child.kill('SIGKILL');
				truncated = true;
			}, COMMAND_TIMEOUT_MS);

			const append = (current: string, chunk: Buffer) => {
				const next = Buffer.concat([Buffer.from(current, 'utf8'), chunk]);
				if (next.length > MAX_OUTPUT_BYTES) {
					truncated = true;
					return truncateBufferToUtf8String(next, MAX_OUTPUT_BYTES);
				}
				return next.toString('utf8');
			};

			child.stdout.on('data', (chunk: Buffer) => {
				stdout = append(stdout, chunk);
			});
			child.stderr.on('data', (chunk: Buffer) => {
				stderr = append(stderr, chunk);
			});
			child.on('error', reject);
			child.on('close', (exitCode) => {
				clearTimeout(timer);
				resolve({ command, exitCode, stdout, stderr, truncated });
			});
		});
	}
}

function truncateBufferToUtf8String(buffer: Buffer, maxBytes: number) {
	for (let end = maxBytes; end >= 0; end--) {
		const output = buffer.subarray(0, end).toString('utf8');
		if (Buffer.byteLength(output) <= maxBytes) return output;
	}

	return '';
}
