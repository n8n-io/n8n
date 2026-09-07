import type { Logger } from '@n8n/backend-common';
import type ivm from 'isolated-vm';

import { SANDBOX_POLYFILLS } from './sandbox-polyfills';

export class PoolDisposedError extends Error {
	constructor() {
		super('Agent isolate pool is disposed');
		this.name = 'PoolDisposedError';
	}
}

export class PoolExhaustedError extends Error {
	constructor() {
		super('Agent isolate pool is exhausted — too many concurrent requests. Try again later.');
		this.name = 'PoolExhaustedError';
	}
}

/**
 * A single V8 isolate + pre-compiled bundle script.
 *
 * Holds one `ivm.Isolate` and the library bundle compiled into V8 bytecode.
 * In Phase 1 each request creates a fresh context via `createContext()`.
 * In Phase 2 (reusable context) the context will be created once at init.
 */
export class AgentIsolateSlot {
	readonly isolate: ivm.Isolate;

	private bundleScript: ivm.Script;

	constructor(ivmModule: typeof ivm, memoryLimit: number, libraryBundle: string) {
		this.isolate = new ivmModule.Isolate({ memoryLimit });
		this.bundleScript = this.isolate.compileScriptSync(libraryBundle);
	}

	get isHealthy(): boolean {
		return !this.isolate.isDisposed;
	}

	/**
	 * Create a fresh context with polyfills, require shim, and the library bundle
	 * already evaluated. The caller is responsible for calling `context.release()`
	 * when done.
	 */
	createContext(): ivm.Context {
		const context = this.isolate.createContextSync();
		try {
			const jail = context.global;

			jail.setSync('global', jail.derefInto());

			context.evalSync(SANDBOX_POLYFILLS, { timeout: 5000 });

			context.evalSync(
				`
				globalThis.__modules = {};
				globalThis.require = function(id) {
					if (globalThis.__modules[id]) {
						return globalThis.__modules[id];
					}
					// Return empty stub for unknown modules (Node built-ins, etc.)
					return new Proxy({}, {
						get: function(target, prop) {
							if (prop === '__esModule') return false;
							if (prop === 'default') return {};
							return function() { return {}; };
						}
					});
				};
			`,
				{ timeout: 5000 },
			);

			this.bundleScript.runSync(context, { timeout: 10000 });

			return context;
		} catch (e) {
			context.release();
			throw e;
		}
	}

	dispose(): void {
		if (this.isHealthy) {
			this.bundleScript.release();
			this.isolate.dispose();
		}
	}
}

export interface AgentIsolatePoolOptions {
	/** Number of warm isolate slots to keep ready. Default: 2. */
	size?: number;
	/** Per-isolate memory limit in MB. Default: 32. */
	memoryLimit?: number;
	/**
	 * Fraction of `memoryLimit` above which a slot is proactively recycled
	 * on release instead of being returned to the pool. Default: 0.8.
	 */
	highWaterMarkRatio?: number;
	/**
	 * Maximum number of `acquire()` calls that can wait for a free slot.
	 * Beyond this, `acquire()` rejects immediately with `PoolExhaustedError`.
	 * Default: 10.
	 */
	maxQueueDepth?: number;
	/** Logger instance for pool lifecycle events. */
	logger?: Logger;
}

type WaitEntry = {
	resolve: (slot: AgentIsolateSlot) => void;
	reject: (error: Error) => void;
};

// TODO: add slot TTL eviction to reduce idle memory usage
/**
 * Pool of `AgentIsolateSlot` instances with queuing semantics.
 *
 * - `acquire()` pops a healthy slot from the pool. If the pool is empty the
 *   call returns a Promise that resolves when a slot is released back.
 * - `release(slot)` returns a slot to the pool (or discards it if unhealthy /
 *   over the high-water mark) and triggers background replenishment.
 * - `tryAcquireSync()` is a non-blocking variant for the sync execution path.
 * - Replenishment retries up to `MAX_REPLENISH_RETRIES` times with
 *   exponential backoff on failure.
 */
export class AgentIsolatePool {
	private slots: AgentIsolateSlot[] = [];

	private waitQueue: WaitEntry[] = [];

	private disposed = false;

	/** Number of slots currently being created asynchronously. */
	private warming = 0;

	/** Tracked so `dispose()` can await in-flight replenishments. */
	private replenishPromises = new Set<Promise<void>>();

	private readonly size: number;

	private readonly memoryLimit: number;

	private readonly highWaterMarkRatio: number;

	private readonly maxQueueDepth: number;

	private readonly logger: Logger | undefined;

	private static readonly MAX_REPLENISH_RETRIES = 3;

	private static readonly REPLENISH_RETRY_BASE_MS = 500;

	constructor(
		private readonly ivmModule: typeof ivm,
		private readonly libraryBundle: string,
		options: AgentIsolatePoolOptions = {},
	) {
		this.size = options.size ?? 2;
		this.memoryLimit = options.memoryLimit ?? 32;
		this.highWaterMarkRatio = options.highWaterMarkRatio ?? 0.8;
		this.maxQueueDepth = options.maxQueueDepth ?? 10;
		this.logger = options.logger;
	}

	async initialize(): Promise<void> {
		const results = await Promise.allSettled(
			Array.from({ length: this.size }, async () => await Promise.resolve(this.createSlot())),
		);

		for (const result of results) {
			if (result.status === 'fulfilled') {
				this.slots.push(result.value);
			} else {
				this.logger?.warn('[AgentIsolatePool] Failed to create slot during init', {
					error: result.reason instanceof Error ? result.reason.message : String(result.reason),
				});
			}
		}

		if (this.slots.length === 0) {
			const firstRejection = results.find((r) => r.status === 'rejected');
			const cause =
				firstRejection?.reason instanceof Error
					? firstRejection.reason
					: new Error(String(firstRejection?.reason));
			throw new Error(
				'AgentIsolatePool: failed to create any isolate slots during initialization',
				{ cause },
			);
		}

		// Kick off background replenishment for any slots that failed during init.
		const missing = this.size - this.slots.length;
		for (let i = 0; i < missing; i++) {
			void this.replenish();
		}
	}

	/**
	 * Acquire a slot from the pool.
	 *
	 * If the pool is empty the returned Promise is queued and resolves when
	 * another caller releases a slot (or replenishment completes).
	 * Rejects immediately with `PoolExhaustedError` when the wait queue is full.
	 */
	async acquire(): Promise<AgentIsolateSlot> {
		if (this.disposed) throw new PoolDisposedError();

		const slot = this.slots.shift();
		if (slot) {
			// Kick off background replenishment to refill the pool proactively.
			void this.replenish();
			return slot;
		}

		if (this.waitQueue.length >= this.maxQueueDepth) {
			this.logger?.warn('[AgentIsolatePool] Pool exhausted — request rejected', {
				queueDepth: this.waitQueue.length,
				maxQueueDepth: this.maxQueueDepth,
			});
			throw new PoolExhaustedError();
		}

		return await new Promise<AgentIsolateSlot>((resolve, reject) => {
			this.waitQueue.push({ resolve, reject });
		});
	}

	/**
	 * Return a slot to the pool.
	 *
	 * Unhealthy slots (disposed isolate or heap over high-water mark) are
	 * discarded and background replenishment is triggered. Healthy slots
	 * are passed directly to the next waiter or pushed back into the pool.
	 */
	release(slot: AgentIsolateSlot): void {
		if (this.disposed) {
			slot.dispose();
			return;
		}

		if (!slot.isHealthy) {
			this.logger?.warn('[AgentIsolatePool] Slot OOM — discarding and replenishing');
			slot.dispose();
			void this.replenish();
			return;
		}

		if (this.isOverHighWaterMark(slot)) {
			this.logger?.debug('[AgentIsolatePool] Slot over high-water mark — proactively recycling');
			slot.dispose();
			void this.replenish();
			return;
		}

		const waiter = this.waitQueue.shift();
		if (waiter) {
			waiter.resolve(slot);
			return;
		}

		this.slots.push(slot);
	}

	/**
	 * Non-blocking acquire for the synchronous execution path.
	 * Returns `null` instead of queuing when the pool is empty.
	 */
	tryAcquireSync(): AgentIsolateSlot | null {
		if (this.disposed) return null;

		const slot = this.slots.shift();
		if (slot) {
			void this.replenish();
			return slot;
		}

		return null;
	}

	async dispose(): Promise<void> {
		this.disposed = true;

		const error = new PoolDisposedError();
		for (const { reject } of this.waitQueue) {
			reject(error);
		}
		this.waitQueue = [];

		await Promise.all([...this.replenishPromises]);

		for (const slot of this.slots) {
			slot.dispose();
		}
		this.slots = [];
	}

	private isOverHighWaterMark(slot: AgentIsolateSlot): boolean {
		try {
			const stats = slot.isolate.getHeapStatisticsSync();
			const limitBytes = this.memoryLimit * 1024 * 1024;
			return stats.used_heap_size > limitBytes * this.highWaterMarkRatio;
		} catch (error) {
			this.logger?.warn(
				'[AgentIsolatePool] Failed to get heap statistics — assuming over high-water mark',
				{
					error: error instanceof Error ? error.message : String(error),
				},
			);
			return true;
		}
	}

	private createSlot(): AgentIsolateSlot {
		return new AgentIsolateSlot(this.ivmModule, this.memoryLimit, this.libraryBundle);
	}

	private replenish(attempt = 0): void {
		if (this.disposed) return;
		// Don't over-warm: keep total of (available + warming) at pool size.
		if (this.slots.length + this.warming >= this.size) return;

		this.warming++;
		let promise: Promise<void>;
		// eslint-disable-next-line prefer-const
		promise = Promise.resolve()
			.then(() => {
				const slot = this.createSlot();
				this.warming--;
				this.replenishPromises.delete(promise);

				if (this.disposed) {
					slot.dispose();
					return;
				}

				const waiter = this.waitQueue.shift();
				if (waiter) {
					waiter.resolve(slot);
					// Slot went to a waiter, not into the pool — try to replenish again.
					void this.replenish();
				} else {
					this.slots.push(slot);
				}
			})
			.catch((error: unknown) => {
				this.warming--;
				this.replenishPromises.delete(promise);

				if (attempt < AgentIsolatePool.MAX_REPLENISH_RETRIES) {
					const delay = AgentIsolatePool.REPLENISH_RETRY_BASE_MS * 2 ** attempt;
					this.logger?.debug('[AgentIsolatePool] Replenishment failed, retrying', {
						attempt,
						delayMs: delay,
						error: error instanceof Error ? error.message : String(error),
					});
					// Track the retry timer in replenishPromises so dispose() awaits it.
					let retryPromise: Promise<void>;
					// eslint-disable-next-line prefer-const
					retryPromise = new Promise<void>((resolve) => {
						setTimeout(resolve, delay).unref();
					}).then(() => {
						this.replenishPromises.delete(retryPromise);
						this.replenish(attempt + 1);
					});
					this.replenishPromises.add(retryPromise);
				} else {
					this.logger?.warn('[AgentIsolatePool] Replenishment failed after max retries', {
						error: error instanceof Error ? error.message : String(error),
					});
					// Unblock any callers waiting for a slot — they cannot be served.
					const waitError = new Error(
						'Isolate slot creation permanently failed — no slots available',
					);
					for (const { reject } of this.waitQueue.splice(0)) {
						reject(waitError);
					}
				}
			});
		this.replenishPromises.add(promise);
	}
}
