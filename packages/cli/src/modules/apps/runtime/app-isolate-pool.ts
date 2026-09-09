import type { Logger } from '@n8n/backend-common';
import type ivm from 'isolated-vm';

/**
 * Adapted from `packages/cli/src/modules/agents/runtime/agent-isolate-pool.ts`
 * (by @elsmr's original agents runtime) and trimmed for the apps `code` block:
 * no pre-bundled library (a code block gets host functions only, no
 * `require`), so a slot is just a bare isolate with a fresh context per call.
 */
export class PoolDisposedError extends Error {
	constructor() {
		super('App isolate pool is disposed');
		this.name = 'PoolDisposedError';
	}
}

export class PoolExhaustedError extends Error {
	constructor() {
		super('App isolate pool is exhausted — too many concurrent renders. Try again later.');
		this.name = 'PoolExhaustedError';
	}
}

/** One `ivm.Isolate`. `import`/`require` are intentionally absent from the context. */
export class AppIsolateSlot {
	readonly isolate: ivm.Isolate;

	constructor(ivmModule: typeof ivm, memoryLimitMb: number) {
		this.isolate = new ivmModule.Isolate({ memoryLimit: memoryLimitMb });
	}

	get isHealthy(): boolean {
		return !this.isolate.isDisposed;
	}

	/** Caller releases the returned context when done. */
	createContext(): ivm.Context {
		const context = this.isolate.createContextSync();
		context.global.setSync('global', context.global.derefInto());
		return context;
	}

	dispose(): void {
		if (this.isHealthy) this.isolate.dispose();
	}
}

export interface AppIsolatePoolOptions {
	/** Number of warm isolate slots to keep ready. Default: 2. */
	size?: number;
	/** Per-isolate memory limit in MB. Default: 32. */
	memoryLimit?: number;
	/** Fraction of `memoryLimit` above which a slot is recycled on release. Default: 0.8. */
	highWaterMarkRatio?: number;
	/** Callers queued waiting for a free slot before `acquire()` rejects. Default: 10. */
	maxQueueDepth?: number;
	logger?: Logger;
}

type WaitEntry = {
	resolve: (slot: AppIsolateSlot) => void;
	reject: (error: Error) => void;
};

/**
 * Pool of {@link AppIsolateSlot} instances with queuing semantics — see
 * `agent-isolate-pool.ts` for the fuller write-up this was adapted from.
 */
export class AppIsolatePool {
	private slots: AppIsolateSlot[] = [];

	private waitQueue: WaitEntry[] = [];

	private disposed = false;

	private warming = 0;

	private readonly replenishPromises = new Set<Promise<void>>();

	private readonly size: number;

	private readonly memoryLimit: number;

	private readonly highWaterMarkRatio: number;

	private readonly maxQueueDepth: number;

	private readonly logger: Logger | undefined;

	private static readonly MAX_REPLENISH_RETRIES = 3;

	private static readonly REPLENISH_RETRY_BASE_MS = 500;

	constructor(
		private readonly ivmModule: typeof ivm,
		options: AppIsolatePoolOptions = {},
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
				this.logger?.warn('[AppIsolatePool] Failed to create slot during init', {
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
			throw new Error('AppIsolatePool: failed to create any isolate slots during initialization', {
				cause,
			});
		}

		const missing = this.size - this.slots.length;
		for (let i = 0; i < missing; i++) void this.replenish();
	}

	async acquire(): Promise<AppIsolateSlot> {
		if (this.disposed) throw new PoolDisposedError();

		const slot = this.slots.shift();
		if (slot) {
			void this.replenish();
			return slot;
		}

		if (this.waitQueue.length >= this.maxQueueDepth) {
			throw new PoolExhaustedError();
		}

		return await new Promise<AppIsolateSlot>((resolve, reject) => {
			this.waitQueue.push({ resolve, reject });
		});
	}

	/** Unhealthy or over-limit slots are discarded and replenished instead of reused. */
	release(slot: AppIsolateSlot): void {
		if (this.disposed) {
			slot.dispose();
			return;
		}

		if (!slot.isHealthy || this.isOverHighWaterMark(slot)) {
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

	async dispose(): Promise<void> {
		this.disposed = true;

		const error = new PoolDisposedError();
		for (const { reject } of this.waitQueue) reject(error);
		this.waitQueue = [];

		await Promise.all([...this.replenishPromises]);

		for (const slot of this.slots) slot.dispose();
		this.slots = [];
	}

	private isOverHighWaterMark(slot: AppIsolateSlot): boolean {
		try {
			const stats = slot.isolate.getHeapStatisticsSync();
			const limitBytes = this.memoryLimit * 1024 * 1024;
			return stats.used_heap_size > limitBytes * this.highWaterMarkRatio;
		} catch {
			return true;
		}
	}

	private createSlot(): AppIsolateSlot {
		return new AppIsolateSlot(this.ivmModule, this.memoryLimit);
	}

	private replenish(attempt = 0): void {
		if (this.disposed) return;
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
					void this.replenish();
				} else {
					this.slots.push(slot);
				}
			})
			.catch((error: unknown) => {
				this.warming--;
				this.replenishPromises.delete(promise);

				if (attempt < AppIsolatePool.MAX_REPLENISH_RETRIES) {
					const delay = AppIsolatePool.REPLENISH_RETRY_BASE_MS * 2 ** attempt;
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
					this.logger?.warn('[AppIsolatePool] Replenishment failed after max retries', {
						error: error instanceof Error ? error.message : String(error),
					});
					const waitError = new Error(
						'Isolate slot creation permanently failed — no slots available',
					);
					for (const { reject } of this.waitQueue.splice(0)) reject(waitError);
				}
			});
		this.replenishPromises.add(promise);
	}
}
