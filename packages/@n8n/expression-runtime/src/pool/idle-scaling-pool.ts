import { EXPRESSION_METRICS } from '../observability/metrics';
import type { ObservabilityProvider, RuntimeBridge } from '../types';
import type { Logger } from '../types/bridge';
import type { IPool } from './isolate-pool';
import { IsolatePool, PoolDisposedError, PoolExhaustedError } from './isolate-pool';

/**
 * Wraps an `IsolatePool`, disposing it after a configured idle period and
 * recreating it on the next acquire. The inner pool either fully exists or
 * does not; callers never observe a partial state.
 */
export class IdleScalingPool implements IPool {
	private innerPool: IsolatePool | null = null;
	private pendingScaleUp: Promise<void> | null = null;
	private pendingScaleDown: Promise<void> | null = null;
	private readonly borrowedBridges = new Set<RuntimeBridge>();
	private idleTimer?: NodeJS.Timeout;
	private disposed = false;
	private disposePromise?: Promise<void>;

	constructor(
		private readonly createBridge: () => Promise<RuntimeBridge>,
		private readonly size: number,
		private readonly idleTimeoutMs?: number,
		private readonly onReplenishFailed?: (error: unknown) => void,
		private readonly logger?: Logger,
		private readonly observability?: ObservabilityProvider,
	) {}

	async initialize(): Promise<void> {
		this.innerPool = this.createInnerPool();
		await this.innerPool.initialize();
		this.resetIdleTimer();
	}

	acquire(): RuntimeBridge {
		if (this.disposed) throw new PoolDisposedError();
		if (!this.innerPool) {
			this.triggerScaleUp();
			throw new PoolExhaustedError();
		}
		this.clearIdleTimer();
		const bridge = this.innerPool.acquire();
		this.borrowedBridges.add(bridge);
		return bridge;
	}

	async release(bridge: RuntimeBridge): Promise<void> {
		const wasBorrowed = this.borrowedBridges.delete(bridge);
		if (this.innerPool && !this.disposed) {
			// Pool is live: delegate so the inner pool disposes and replenishes.
			await this.innerPool.release(bridge);
		} else if (!bridge.isDisposed()) {
			// Pool is idle, disposed, or the bridge came from cold-start fallback:
			// no pool to delegate to, just dispose to free the V8 isolate.
			await bridge.dispose();
		}
		if (wasBorrowed && this.borrowedBridges.size === 0 && this.innerPool && !this.disposed) {
			this.resetIdleTimer();
		}
	}

	async dispose(): Promise<void> {
		return (this.disposePromise ??= this.doDispose());
	}

	private async doDispose(): Promise<void> {
		this.disposed = true;
		this.clearIdleTimer();
		await this.drainPendingTransitions();
		if (this.innerPool) {
			const toDispose = this.innerPool;
			this.innerPool = null;
			await toDispose.dispose();
		}
	}

	async waitForReplenishment(): Promise<void> {
		await this.drainPendingTransitions();
		if (this.innerPool) await this.innerPool.waitForReplenishment();
	}

	private async drainPendingTransitions(): Promise<void> {
		// Snapshot both fields before awaiting so a transition starting between reads
		// can't be missed. Waits for transitions in flight now, not ones started later.
		const promises: Promise<void>[] = [];
		if (this.pendingScaleUp) promises.push(this.pendingScaleUp.catch(() => {}));
		if (this.pendingScaleDown) promises.push(this.pendingScaleDown.catch(() => {}));

		await Promise.all(promises);
	}

	private createInnerPool(): IsolatePool {
		return new IsolatePool(this.createBridge, this.size, this.onReplenishFailed, this.logger);
	}

	private resetIdleTimer(): void {
		if (this.idleTimeoutMs === undefined) return;
		this.clearIdleTimer();
		this.idleTimer = setTimeout(() => this.triggerScaleDown(), this.idleTimeoutMs);
		this.idleTimer.unref();
	}

	private clearIdleTimer(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = undefined;
		}
	}

	private triggerScaleUp(): void {
		if (this.pendingScaleUp || this.innerPool || this.disposed) return;
		this.logger?.info('[IdleScalingPool] Scaling up from idle');
		this.observability?.metrics.counter(EXPRESSION_METRICS.poolScaledUp.name, 1);

		const newInner = this.createInnerPool();
		this.pendingScaleUp = newInner
			.initialize()
			.then(async () => {
				if (this.disposed) {
					await newInner.dispose();
					return;
				}
				this.innerPool = newInner;
				this.resetIdleTimer();
			})
			.catch(async (error: unknown) => {
				this.logger?.error('[IdleScalingPool] Scale-up failed', { error });
				await newInner.dispose().catch(() => {});
			})
			.finally(() => {
				this.pendingScaleUp = null;
			});
	}

	private triggerScaleDown(): void {
		if (
			this.pendingScaleDown ||
			this.pendingScaleUp ||
			!this.innerPool ||
			this.disposed ||
			this.borrowedBridges.size > 0
		) {
			return;
		}
		this.logger?.info('[IdleScalingPool] Scaling to 0 after inactivity', {
			idleTimeoutMs: this.idleTimeoutMs,
		});
		this.observability?.metrics.counter(EXPRESSION_METRICS.poolScaledToZero.name, 1);

		const oldInner = this.innerPool;
		this.innerPool = null;
		this.pendingScaleDown = oldInner
			.dispose()
			.catch((error: unknown) => {
				this.logger?.error('[IdleScalingPool] Scale-down dispose failed', { error });
			})
			.finally(() => {
				this.pendingScaleDown = null;
			});
	}
}
