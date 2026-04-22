import type { RuntimeBridge } from '../types';
import type { Logger } from '../types/bridge';
import { IsolateError } from '@n8n/errors';

export class PoolDisposedError extends IsolateError {
	constructor() {
		super('Pool is disposed');
		this.name = 'PoolDisposedError';
	}
}

export class PoolExhaustedError extends IsolateError {
	constructor() {
		super('No isolate bridge available in pool');
		this.name = 'PoolExhaustedError';
	}
}

/** Public contract shared by IsolatePool and IdleScalingPool. */
export interface IPool {
	initialize(): Promise<void>;
	acquire(): RuntimeBridge;
	release(bridge: RuntimeBridge): Promise<void>;
	dispose(): Promise<void>;
	waitForReplenishment(): Promise<void>;
}

export class IsolatePool implements IPool {
	private bridges: RuntimeBridge[] = [];
	private disposed = false;
	/** Number of bridges currently being created. */
	private warming = 0;
	/** In-flight isolate replenishment promises. */
	private replenishPromises = new Set<Promise<void>>();

	constructor(
		private readonly createBridge: () => Promise<RuntimeBridge>,
		private readonly size: number,
		private readonly onReplenishFailed?: (error: unknown) => void,
		private readonly logger?: Logger,
	) {}

	async initialize() {
		const results = await Promise.allSettled(
			Array.from({ length: this.size }, () => this.createBridge()),
		);

		for (const result of results) {
			if (result.status === 'fulfilled') {
				this.bridges.push(result.value);
			} else {
				this.logger?.error('[IsolatePool] Failed to create bridge during init', {
					error: result.reason,
				});
			}
		}

		if (this.bridges.length === 0) {
			throw new IsolateError('IsolatePool failed to create any bridges');
		}
	}

	/**
	 * Pops a warm bridge from the pool. Kickstarts replenishment.
	 * Throws if disposed or pool is empty. Callers are expected to handle the empty case by falling back to cold-start bridge creation.
	 */
	acquire(): RuntimeBridge {
		if (this.disposed) throw new PoolDisposedError();
		const bridge = this.bridges.shift();
		if (!bridge) throw new PoolExhaustedError();
		void this.replenish();
		return bridge;
	}

	async release(bridge: RuntimeBridge) {
		if (!bridge.isDisposed()) await bridge.dispose();
		this.replenish();
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		await Promise.all([...this.replenishPromises]);
		await Promise.all(this.bridges.map((b) => b.dispose()));
		this.bridges = [];
	}

	private static readonly MAX_REPLENISH_RETRIES = 3;
	private static readonly REPLENISH_RETRY_BASE_MS = 500;

	async waitForReplenishment(): Promise<void> {
		if (this.replenishPromises.size > 0) {
			await Promise.all([...this.replenishPromises]);
		}
	}

	private replenish(attempt = 0) {
		if (this.disposed) return;
		if (this.bridges.length + this.warming >= this.size) return;

		this.warming++;
		let promise: Promise<void>;
		promise = this.createBridge()
			.then((bridge) => {
				this.warming--;
				this.replenishPromises.delete(promise);
				if (this.disposed) {
					void bridge.dispose();
					return;
				}
				this.bridges.push(bridge);
			})
			.catch((error: unknown) => {
				this.warming--;
				this.replenishPromises.delete(promise);
				this.onReplenishFailed?.(error);

				if (attempt < IsolatePool.MAX_REPLENISH_RETRIES) {
					const delay = IsolatePool.REPLENISH_RETRY_BASE_MS * 2 ** attempt;
					setTimeout(() => this.replenish(attempt + 1), delay).unref();
				}
			});
		this.replenishPromises.add(promise);
	}
}
