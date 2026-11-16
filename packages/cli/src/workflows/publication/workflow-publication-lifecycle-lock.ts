import { Service } from '@n8n/di';

interface WorkflowLockState {
	locked: boolean;
	waiters: Array<() => void>;
}

interface RunExclusiveOptions<T> {
	workflowId: string;
	fn: () => Promise<T>;
	/** Bounds the wait for the lock: an abort while waiting rejects with its reason. */
	signal: AbortSignal;
}

/**
 * Per-workflow FIFO async locks coordinating the publication outbox consumer
 * (which activates a workflow's triggers while applying a record) with leader
 * stepdown teardown (which deactivates them). For a given workflow these must
 * never run concurrently: otherwise a deactivate/reactivate interleaving could
 * leave a trigger running on a demoted instance.
 *
 * The lock is keyed by workflow id rather than instance-global so unrelated
 * workflows never block each other. Teardown never queues on a held lock at
 * all: it checks {@link isLocked} and skips, relying on the periodic sweep to
 * retry after release.
 *
 * Synchronization is local — only the leader processes the outbox — so in-process
 * locks are sufficient; no distributed lock is needed.
 *
 * Hand-rolled rather than using a mutex library: per-workflow keyed FIFO locks
 * with cheap lock-state visibility are the entire requirement — a dependency
 * would cost more than these few lines.
 */
@Service()
export class WorkflowPublicationLifecycleLock {
	private readonly stateByWorkflowId = new Map<string, WorkflowLockState>();

	/** Whether a record is currently holding (or waiting on) this workflow's lock. */
	isLocked(workflowId: string): boolean {
		return this.stateByWorkflowId.has(workflowId);
	}

	/** Runs `fn` under the workflow's lock, waiting until the lock is free or `signal` aborts. */
	async runExclusive<T>({ workflowId, fn, signal }: RunExclusiveOptions<T>): Promise<T> {
		await this.acquire(workflowId, signal);
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

	private async acquire(workflowId: string, signal: AbortSignal): Promise<void> {
		signal.throwIfAborted();

		const state = this.getOrCreateState(workflowId);
		if (!state.locked) {
			state.locked = true;
			return;
		}

		await new Promise<void>((resolve, reject) => {
			const waiter = () => {
				signal.removeEventListener('abort', onAbort);
				resolve();
			};
			// Drop the waiter so a later release hands the lock to the next live
			// one instead of to a caller that has already given up.
			const onAbort = () => {
				const index = state.waiters.indexOf(waiter);
				if (index !== -1) state.waiters.splice(index, 1);
				reject(signal.reason);
			};
			state.waiters.push(waiter);
			signal.addEventListener('abort', onAbort, { once: true });
		});
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
