import type { RuntimeBridge } from '../types';

/** A queued caller waiting for a bridge when the pool is exhausted. */
interface Waiter {
	resolve: (bridge: RuntimeBridge) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

export class IsolatePool {
	private bridges: RuntimeBridge[] = [];
	private waiters: Waiter[] = [];
	private disposed = false;
	private warming = 0;

	constructor(
		private readonly createBridge: () => Promise<RuntimeBridge>,
		private readonly size: number,
		private readonly acquireTimeoutMs: number,
		private readonly onReplenishFailed?: (error: unknown) => void,
	) {}

	async initialize() {
		const results = await Promise.allSettled(
			Array.from({ length: this.size }, () => this.createBridge()),
		);

		for (const result of results) {
			if (result.status === 'fulfilled') {
				this.bridges.push(result.value);
			} else {
				console.error('[IsolatePool] Failed to create bridge during init:', result.reason);
			}
		}

		if (this.bridges.length === 0) {
			throw new Error('IsolatePool failed to create any bridges');
		}
	}

	/** Returns a bridge immediately or `undefined` if pool is empty. Non-blocking. */
	acquireImmediately() {
		if (this.disposed) throw new Error('Pool is disposed');
		return this.bridges.shift();
	}

	/** Returns a bridge, waiting in a FIFO queue if pool is empty. */
	async acquireOrWait(): Promise<RuntimeBridge> {
		if (this.disposed) throw new Error('Pool is disposed');

		const bridge = this.bridges.shift();
		if (bridge) return bridge;

		return new Promise<RuntimeBridge>((resolve, reject) => {
			const timer = setTimeout(() => {
				const index = this.waiters.findIndex((w) => w.resolve === resolve);
				if (index !== -1) this.waiters.splice(index, 1);
				reject(new Error(`Timed out waiting for isolate (${this.acquireTimeoutMs}ms)`));
			}, this.acquireTimeoutMs);

			this.waiters.push({ resolve, reject, timer });
		});
	}

	returnToPool(bridge: RuntimeBridge) {
		if (this.disposed) return;
		if (bridge.isDisposed()) {
			this.replenish();
			return;
		}
		const waiter = this.waiters.shift();
		if (waiter) {
			clearTimeout(waiter.timer);
			waiter.resolve(bridge);
		} else {
			this.bridges.push(bridge);
		}
	}

	async release(bridge: RuntimeBridge) {
		if (!bridge.isDisposed()) await bridge.dispose();
		this.replenish();
	}

	async dispose() {
		this.disposed = true;
		for (const waiter of this.waiters) {
			clearTimeout(waiter.timer);
			waiter.reject(new Error('Pool is being disposed'));
		}
		this.waiters = [];
		await Promise.all(this.bridges.map((b) => b.dispose()));
		this.bridges = [];
	}

	private static readonly MAX_REPLENISH_RETRIES = 3;
	private static readonly REPLENISH_RETRY_BASE_MS = 500;

	private replenish(attempt = 0) {
		if (this.disposed) return;
		if (this.bridges.length + this.warming >= this.size) return;

		this.warming++;
		void this.createBridge()
			.then((bridge) => {
				this.warming--;
				if (this.disposed) {
					void bridge.dispose();
					return;
				}
				const waiter = this.waiters.shift();
				if (waiter) {
					clearTimeout(waiter.timer);
					waiter.resolve(bridge);
				} else {
					this.bridges.push(bridge);
				}
			})
			.catch((error: unknown) => {
				this.warming--;
				this.onReplenishFailed?.(error);

				if (attempt < IsolatePool.MAX_REPLENISH_RETRIES) {
					const delay = IsolatePool.REPLENISH_RETRY_BASE_MS * 2 ** attempt;
					setTimeout(() => this.replenish(attempt + 1), delay).unref();
				}
			});
	}
}
