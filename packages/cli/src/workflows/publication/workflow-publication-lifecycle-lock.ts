import { Service } from '@n8n/di';

interface WorkflowLockState {
	locked: boolean;
	waiters: Array<() => void>;
}

/**
 * Per-workflow FIFO async locks coordinating the publication outbox consumer
 * (which activates a workflow's triggers while applying a record) with leader
 * stepdown teardown (which deactivates them). For a given workflow these must
 * never run concurrently: otherwise a deactivate/reactivate interleaving could
 * leave a trigger running on a demoted instance.
 *
 * The lock is keyed by workflow id rather than instance-global so unrelated
 * workflows never block each other — teardown can deactivate every workflow with
 * no in-flight record immediately and wait only on the ones being processed.
 *
 * Synchronization is local — only the leader processes the outbox — so in-process
 * locks are sufficient; no distributed lock is needed.
 *
 * Hand-rolled rather than using a mutex library: we need per-workflow keyed locks,
 * and {@link runExclusiveOrTimeout} runs `fn` anyway (without the lock) on timeout
 * instead of rejecting — off-the-shelf mutexes don't offer this.
 */
@Service()
export class WorkflowPublicationLifecycleLock {
	private readonly stateByWorkflowId = new Map<string, WorkflowLockState>();

	/** Whether a record is currently holding (or waiting on) this workflow's lock. */
	isLocked(workflowId: string): boolean {
		return this.stateByWorkflowId.has(workflowId);
	}

	/** Workflow ids currently holding or waiting on a lifecycle lock. */
	getLockedWorkflowIds(): string[] {
		return Array.from(this.stateByWorkflowId.keys());
	}

	/** Runs `fn` under the workflow's lock, waiting indefinitely to acquire it. */
	async runExclusive<T>(workflowId: string, fn: () => Promise<T>): Promise<T> {
		await this.acquire(workflowId);
		try {
			return await fn();
		} finally {
			this.release(workflowId);
		}
	}

	/**
	 * Acquires the workflow's lock within `timeoutMs` and runs `fn` under it. If it
	 * cannot be acquired in time (e.g. an in-flight record is stuck), `fn` runs
	 * WITHOUT the lock so the caller still makes progress, and `timedOut` is `true`.
	 */
	async runExclusiveOrTimeout(
		workflowId: string,
		fn: () => Promise<void>,
		timeoutMs: number,
	): Promise<{ timedOut: boolean }> {
		const acquired = await this.acquireWithTimeout(workflowId, timeoutMs);

		if (!acquired) {
			await fn();
			return { timedOut: true };
		}

		try {
			await fn();
		} finally {
			this.release(workflowId);
		}

		return { timedOut: false };
	}

	private getOrCreateState(workflowId: string): WorkflowLockState {
		let state = this.stateByWorkflowId.get(workflowId);
		if (!state) {
			state = { locked: false, waiters: [] };
			this.stateByWorkflowId.set(workflowId, state);
		}
		return state;
	}

	private async acquire(workflowId: string): Promise<void> {
		const state = this.getOrCreateState(workflowId);
		if (!state.locked) {
			state.locked = true;
			return;
		}

		await new Promise<void>((resolve) => state.waiters.push(resolve));
	}

	/** Hands ownership to the next waiter, or drops the entry when none are waiting. */
	private release(workflowId: string): void {
		const state = this.stateByWorkflowId.get(workflowId);
		if (!state) return;

		const next = state.waiters.shift();
		if (next) {
			next();
		} else {
			this.stateByWorkflowId.delete(workflowId);
		}
	}

	private async acquireWithTimeout(workflowId: string, timeoutMs: number): Promise<boolean> {
		const state = this.getOrCreateState(workflowId);
		if (!state.locked) {
			state.locked = true;
			return true;
		}

		return await new Promise<boolean>((resolve) => {
			// `settled` resolves the timeout-vs-handoff race: whichever fires first
			// wins, so the lock is never granted twice nor wedged on an abandoned
			// waiter. On timeout we splice the waiter out so `release` never hands
			// ownership to it.
			let settled = false;

			const waiter = () => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve(true);
			};

			const timer = setTimeout(() => {
				if (settled) return;
				settled = true;
				const index = state.waiters.indexOf(waiter);
				if (index !== -1) state.waiters.splice(index, 1);
				resolve(false);
			}, timeoutMs);

			state.waiters.push(waiter);
		});
	}
}
