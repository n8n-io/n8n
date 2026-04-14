import type { RuntimeBridge, ObservabilityProvider } from '../types';
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

export class IsolatePool {
	private bridges: RuntimeBridge[] = [];
	private disposed = false;
	/** Number of bridges currently being created. */
	private warming = 0;
	/** In-flight isolate replenishment promises. */
	private replenishPromises = new Set<Promise<void>>();
	/** True while the pool has been scaled to 0 due to inactivity. */
	private isIdle = false;
	private idleTimer?: NodeJS.Timeout;
	/** ID bumped on every scaleToZero() call, to prevent overlapping calls. */
	private latestScaleCall = 0;

	constructor(
		private readonly createBridge: () => Promise<RuntimeBridge>,
		private readonly size: number,
		private readonly idleTimeoutMs?: number,
		private readonly onReplenishFailed?: (error: unknown) => void,
		private readonly logger?: Logger,
		private readonly observability?: ObservabilityProvider,
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

		this.reportPoolSize();
		this.startIdleTimer();
	}

	/**
	 * Pops a warm bridge from the pool. Kickstarts replenishment.
	 * Throws if disposed or pool is empty. Callers are expected to handle the empty case by falling back to cold-start bridge creation.
	 */
	acquire(): RuntimeBridge {
		if (this.disposed) throw new PoolDisposedError();

		const wasIdle = this.isIdle;
		this.isIdle = false;
		this.startIdleTimer();

		if (wasIdle) {
			this.logger?.info('[IsolatePool] Scaling back up from idle');
			this.observability?.metrics.counter('expression.pool.scaled_up', 1);
		}

		const bridge = this.bridges.shift();
		if (!bridge) {
			void this.replenish();
			throw new PoolExhaustedError();
		}
		void this.replenish();
		this.reportPoolSize();
		return bridge;
	}

	async release(bridge: RuntimeBridge) {
		if (!bridge.isDisposed()) await bridge.dispose();
		if (!this.isIdle) this.replenish();
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = undefined;
		}
		await Promise.all([...this.replenishPromises]);
		await Promise.all(this.bridges.map((b) => b.dispose()));
		this.bridges = [];
		this.reportPoolSize();
	}

	private static readonly MAX_REPLENISH_RETRIES = 3;
	private static readonly REPLENISH_RETRY_BASE_MS = 500;

	async waitForReplenishment(): Promise<void> {
		if (this.replenishPromises.size > 0) {
			await Promise.all([...this.replenishPromises]);
		}
	}

	private startIdleTimer() {
		if (this.idleTimeoutMs === undefined) return;
		if (this.idleTimer) clearTimeout(this.idleTimer);
		this.idleTimer = setTimeout(() => {
			void this.scaleToZero();
		}, this.idleTimeoutMs);
		this.idleTimer.unref();
	}

	private async scaleToZero() {
		if (this.disposed) return;
		const myCall = ++this.latestScaleCall;
		this.isIdle = true;
		this.idleTimer = undefined;

		// prevent in-flight bridges from leaking
		await this.waitForReplenishment();

		// superseded by a newer scaleToZero call
		if (myCall !== this.latestScaleCall) return;

		// acquire() may have mutated state during the await
		if (this.disposed || !this.isIdle) return;

		const toDispose = this.bridges.splice(0);
		await Promise.all(toDispose.map((b) => b.dispose()));
		this.reportPoolSize();

		this.logger?.info('[IsolatePool] Scaled to 0 after inactivity', {
			idleTimeoutMs: this.idleTimeoutMs,
		});
		this.observability?.metrics.counter('expression.pool.scaled_to_zero', 1);
	}

	private replenish(attempt = 0) {
		if (this.disposed || this.isIdle) return;

		while (this.bridges.length + this.warming < this.size) {
			this.warming++;
			let promise: Promise<void>;
			promise = this.createBridge()
				.then((bridge) => {
					this.warming--;
					this.replenishPromises.delete(promise);
					if (this.disposed || this.isIdle) {
						void bridge.dispose();
						return;
					}
					this.bridges.push(bridge);
					this.reportPoolSize();
				})
				.catch((error: unknown) => {
					this.warming--;
					this.replenishPromises.delete(promise);
					this.onReplenishFailed?.(error);

					if (this.disposed || this.isIdle) return;
					if (attempt < IsolatePool.MAX_REPLENISH_RETRIES) {
						const delay = IsolatePool.REPLENISH_RETRY_BASE_MS * 2 ** attempt;
						setTimeout(() => this.replenish(attempt + 1), delay).unref();
					}
				});
			this.replenishPromises.add(promise);
		}
	}

	private reportPoolSize() {
		this.observability?.metrics.gauge('expression.pool.size', this.bridges.length);
	}
}
