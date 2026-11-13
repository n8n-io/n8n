import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import { N8N_VERSION } from '@/constants';

import { CodeSandboxConfig } from './code-sandbox.config';
import { CodeSandboxTimings } from './code-sandbox-timings';
import { TaskApiClient, TaskApiError, type CodeSandbox } from './task-api-client';

/** The options of a sandbox. A task only runs in a sandbox with equal options. */
export interface SandboxOptions {
	runtime: string;
	runtimeVersion: string;
	slots: number;
	taskMemoryMb: number;
	spareWorkers: boolean;
	reuseWorkers: boolean;
}

/** The sandbox that one attempt of a task runs in. */
export interface Placement {
	scopeKey: string;
	name: string;
	shard: number;
	sandboxId: string;
	/** The id came from the cache: no create request. */
	cached: boolean;
	/** This attempt sent the create, and the service made a new sandbox. */
	created: boolean;
	createMs?: number;
	createTimings?: unknown;
}

/** Counters of one task, for the timing record. */
export interface PlacementStats {
	attempts: number;
	/** Task requests that a full sandbox refused (429). */
	fullRejects: number;
	/** Task requests to a draining or deleted sandbox (410, 404). */
	goneRetries: number;
	/** Time spent waiting after all shards were full. */
	waitMs: number;
}

/** The sandbox has no free slot (429). The task did not start. */
export class SandboxFullError extends Error {}

/** The sandbox drains (410) or is gone (404). The task did not start. */
export class SandboxGoneError extends Error {}

export class SandboxCreateError extends UnexpectedError {}

/** All shards stayed full until the deadline. */
export class SandboxQueueTimeoutError extends UnexpectedError {}

/** A 410 or 404 can repeat if the service moves the name again. */
const MAX_GONE_RETRIES = 2;
const MAX_CACHE_ENTRIES = 10_000;
const BACKOFF_BASE_MS = 50;
const BACKOFF_MAX_MS = 1_000;

/**
 * The sandbox name of a scope shard. Every n8n process computes the same name
 * for the same scope key, options and shard, so the processes share the
 * sandbox. The service scopes names to the tenant.
 */
export function sandboxName(scopeKey: string, options: SandboxOptions, shard: number): string {
	const input = JSON.stringify([
		scopeKey,
		options.runtime,
		options.runtimeVersion,
		options.slots,
		options.taskMemoryMb,
		options.spareWorkers,
		options.reuseWorkers,
		shard,
	]);
	return 'c1-' + createHash('sha256').update(input).digest('hex').slice(0, 40);
}

/** A Map that drops its oldest entry when it is full. */
class BoundedMap<K, V> extends Map<K, V> {
	constructor(private readonly maxEntries: number) {
		super();
	}

	override set(key: K, value: V) {
		this.delete(key);
		super.set(key, value);
		if (this.size > this.maxEntries) this.delete(this.keys().next().value as K);
		return this;
	}
}

/**
 * Places code tasks in sandboxes of the sandbox service (step B of the
 * design): the sandbox of a scope shard has a computed name, so all n8n
 * processes share it. This class keeps no slots and no queue. It caches
 * name → sandbox id, tries the next shard when a sandbox is full, and creates
 * the name again when the sandbox drains or is gone. The service runs the idle
 * timeout and the max age.
 */
@Service()
export class SandboxScopeClient {
	private clientInstance: TaskApiClient | undefined;

	/** Sandbox name → sandbox id. */
	private readonly ids = new BoundedMap<string, string>(MAX_CACHE_ENTRIES);

	/** Creates that run now, per name. Tasks of one name share the create. */
	private readonly creates = new Map<string, Promise<CodeSandbox>>();

	/** Scope key → the last shard that took a task. */
	private readonly lastShard = new BoundedMap<string, number>(MAX_CACHE_ENTRIES);

	/** Execution id → the scope keys (with their runtime) that it used in this process. */
	private readonly executionScopes = new Map<string, Map<string, string>>();

	private shuttingDown = false;

	/** Deletes that run now. Shutdown waits for them. */
	private readonly pendingDeletes = new Set<Promise<void>>();

	constructor(
		private readonly config: CodeSandboxConfig,
		private readonly timings: CodeSandboxTimings,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {}

	get client(): TaskApiClient {
		this.clientInstance ??= new TaskApiClient(this.config.serviceUrl, this.config.serviceApiKey);
		return this.clientInstance;
	}

	options(runtime: string): SandboxOptions {
		return {
			runtime,
			runtimeVersion: N8N_VERSION,
			slots: this.config.slots,
			taskMemoryMb: this.config.taskMemoryMb,
			spareWorkers: this.config.spareWorkers,
			reuseWorkers: this.config.reuseWorkers,
		};
	}

	/**
	 * Runs `attempt` in a sandbox of the scope. `attempt` throws
	 * SandboxFullError or SandboxGoneError when the task did not start. Then
	 * this tries the next shard, or creates the name again. When all shards are
	 * full, it waits and starts again, until `maxQueueMs`.
	 */
	async run<T>(
		scopeKey: string,
		runtime: string,
		executionId: string | undefined,
		attempt: (placement: Placement) => Promise<T>,
		stats: PlacementStats,
	): Promise<T> {
		if (this.shuttingDown) throw new SandboxCreateError('n8n is shutting down');
		if (executionId && this.config.scope !== 'workflow') {
			let scopes = this.executionScopes.get(executionId);
			if (!scopes) {
				scopes = new Map();
				this.executionScopes.set(executionId, scopes);
			}
			scopes.set(scopeKey, runtime);
		}

		const options = this.options(runtime);
		const shards = Math.max(1, this.config.maxPerKey);
		const deadline = Date.now() + this.config.maxQueueMs;
		const first = this.lastShard.get(scopeKey) ?? 0;
		for (let round = 0; ; round++) {
			for (let i = 0; i < shards; i++) {
				const shard = (first + i) % shards;
				const result = await this.runOnShard(scopeKey, options, shard, attempt, stats);
				if (result.full) continue;
				this.lastShard.set(scopeKey, shard);
				return result.value;
			}
			const left = deadline - Date.now();
			if (left <= 0) {
				throw new SandboxQueueTimeoutError(
					`All ${shards} code sandboxes of the scope stayed full for ${this.config.maxQueueMs} ms`,
				);
			}
			const backoff = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** round);
			const wait = Math.min(left, backoff / 2 + Math.random() * (backoff / 2));
			await new Promise((r) => setTimeout(r, wait));
			stats.waitMs += Math.round(wait);
		}
	}

	private async runOnShard<T>(
		scopeKey: string,
		options: SandboxOptions,
		shard: number,
		attempt: (placement: Placement) => Promise<T>,
		stats: PlacementStats,
	): Promise<{ full: true } | { full: false; value: T }> {
		for (let gone = 0; ; gone++) {
			stats.attempts++;
			const placement = await this.resolve(scopeKey, options, shard);
			try {
				return { full: false, value: await attempt(placement) };
			} catch (e) {
				if (e instanceof SandboxFullError) {
					stats.fullRejects++;
					return { full: true };
				}
				if (e instanceof SandboxGoneError) {
					this.forget(placement);
					if (gone < MAX_GONE_RETRIES) {
						stats.goneRetries++;
						continue;
					}
				}
				// The task may have failed, but the shard took it.
				this.lastShard.set(scopeKey, shard);
				throw e;
			}
		}
	}

	/** Returns the sandbox of a shard: from the cache, or with a create by name. */
	private async resolve(
		scopeKey: string,
		options: SandboxOptions,
		shard: number,
	): Promise<Placement> {
		const name = sandboxName(scopeKey, options, shard);
		const cachedId = this.ids.get(name);
		if (cachedId) {
			return { scopeKey, name, shard, sandboxId: cachedId, cached: true, created: false };
		}
		let pending = this.creates.get(name);
		const initiator = !pending;
		if (!pending) {
			const t0 = Date.now();
			pending = this.create(scopeKey, name, options).then((sb) => {
				sb.timings = { ...sb.timings, create: sb.timings?.create ?? Date.now() - t0 };
				return sb;
			});
			this.creates.set(name, pending);
			void pending
				.then(
					(sb) => this.ids.set(name, sb.id),
					() => {},
				)
				.finally(() => this.creates.delete(name));
		}
		const sb = await pending;
		const created = initiator && sb.created !== false;
		return {
			scopeKey,
			name,
			shard,
			sandboxId: sb.id,
			cached: false,
			created,
			createMs: created ? sb.timings?.create : undefined,
			createTimings: created ? { ...sb.timings, pooled: sb.pooled === true } : undefined,
		};
	}

	/** Create by name. Retries once with jitter after a 5xx or a transport error. */
	private async create(scopeKey: string, name: string, options: SandboxOptions) {
		const request = {
			name,
			runtime: options.runtime,
			slots: options.slots,
			taskMemoryMb: options.taskMemoryMb,
			spareWorkers: options.spareWorkers,
			reuseWorkers: options.reuseWorkers,
			idleTimeoutMs: this.config.idleTimeoutMs,
			// `execution` and `node` scopes end at execution end, not by age.
			maxAgeMs: this.config.scope === 'workflow' ? this.config.maxLifetimeMs : undefined,
			labels: {
				scopeKey,
				scopeType: this.config.scope,
				n8nProcessId: this.instanceSettings.hostId,
			},
		};
		try {
			return await this.client.createSandbox(request);
		} catch (e) {
			if (!isRetryableCreateError(e)) throw toCreateError(e);
			this.logger.warn('Code sandbox create failed, retrying', { error: (e as Error).message });
			await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
			try {
				return await this.client.createSandbox(request);
			} catch (e2) {
				throw toCreateError(e2);
			}
		}
	}

	/** Drops the cached id of the placement. The next task creates the name again. */
	forget(placement: Placement) {
		if (this.ids.get(placement.name) === placement.sandboxId) this.ids.delete(placement.name);
	}

	/**
	 * The execution ended or went to waiting. Closes the `execution` and `node`
	 * scopes that it used in this process. No task of the scope runs now.
	 */
	closeExecution(executionId: string) {
		const scopes = this.executionScopes.get(executionId);
		this.executionScopes.delete(executionId);
		if (!scopes) return;
		for (const [scopeKey, runtime] of scopes) this.closeScope(scopeKey, runtime);
	}

	/**
	 * Deletes the names of all shards of the scope. Another process may have
	 * used other shards, so this deletes all of them. A later create of a name
	 * gets a new sandbox.
	 */
	closeScope(scopeKey: string, runtime: string) {
		const options = this.options(runtime);
		this.lastShard.delete(scopeKey);
		for (let shard = 0; shard < Math.max(1, this.config.maxPerKey); shard++) {
			const name = sandboxName(scopeKey, options, shard);
			const cachedId = this.ids.get(name);
			this.ids.delete(name);
			this.track(this.deleteName(name, cachedId));
		}
	}

	async shutdown() {
		this.shuttingDown = true;
		// Wait for the deletes (at most 10 s), so their records are written.
		await Promise.race([
			Promise.allSettled([...this.pendingDeletes]),
			new Promise((r) => setTimeout(r, 10_000).unref()),
		]);
		await this.timings.flush();
	}

	private async deleteName(name: string, sandboxId: string | undefined) {
		try {
			// Spike measurement: the resource use of the sandbox before the delete.
			if (this.config.timings && sandboxId) {
				try {
					const sb = await this.client.getSandbox(sandboxId);
					this.timings.event('processes', {
						sandboxId,
						runtime: sb.runtime,
						slots: sb.slots,
						workersStarted: sb.workersStarted,
						cpuUsageUsec: sb.cpuUsageUsec,
						memoryPeakBytes: sb.memoryPeakBytes,
						memoryCurrentBytes: sb.memoryCurrentBytes,
						uptimeMs: sb.uptimeMs,
					});
				} catch {}
			}
			await this.client.deleteSandboxesByName(name);
		} catch (e) {
			this.logger.warn('Code sandbox delete by name failed', { name, error: (e as Error).message });
		}
	}

	private track(pending: Promise<void>) {
		this.pendingDeletes.add(pending);
		void pending.finally(() => this.pendingDeletes.delete(pending));
	}
}

function isRetryableCreateError(e: unknown) {
	return e instanceof TaskApiError && (e.status === 0 || e.status >= 500);
}

function toCreateError(e: unknown) {
	return new SandboxCreateError(`Could not get a code sandbox: ${(e as Error).message}`, {
		cause: e,
	});
}
