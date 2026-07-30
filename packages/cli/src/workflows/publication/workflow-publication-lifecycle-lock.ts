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

	/** Runs `fn` under the workflow's lock, waiting indefinitely to acquire it. */
	async runExclusive<T>(workflowId: string, fn: () => Promise<T>): Promise<T> {
		await this.acquire(workflowId);
		try {
			return await fn();
		} finally {
			this.release(workflowId);
		}
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
}
