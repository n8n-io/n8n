import type { ClaimedTask } from '../types';

/**
 * Identifies one claimed row and the lease epoch it was claimed under, for
 * guarded (fenced) updates: an update made under a stale epoch, or by a host
 * that no longer owns the row, matches no row and is a benign no-op.
 */
export interface ClaimedTaskRef {
	/** The instance that holds the claim. */
	host: string;
	id: string;
	/** The lease epoch read at claim time; the fence for every later write. */
	claimedEpoch: number;
}

/** What one claim pass asks the store for. */
export interface ClaimDueTasksBatch {
	/** The claiming instance, recorded as the rows' owner. */
	host: string;
	/** Only tasks of these types are claimed (work this instance can run). */
	taskTypes: string[];
	/** How far past DB-now a task's `runAt` may be and still be claimed, in ms. */
	lookaheadMs: number;
	/** How long the claim's lease lasts, in ms. */
	leaseMs: number;
	/** The most tasks one claim takes. */
	batchSize: number;
}

/**
 * The store operations the executor needs, defined here as the executor's own
 * surface so it depends on nothing concrete. `ScheduledTaskRepository`
 * structurally satisfies this (a claimed row satisfies {@link ClaimedTask}), so
 * no adapter is needed at the call site.
 *
 * Every write below is guarded on the ref's host and epoch and on the expected
 * `status`; 0 rows affected means the row is gone or no longer ours and is
 * benign, never an error.
 */
export interface ExecutorTaskStore {
	/**
	 * Atomically claim up to `batchSize` due tasks of the given types: mark them
	 * `running`, owned by `host`, with a lease of `leaseMs` and a bumped epoch.
	 */
	claimDueTasks(batch: ClaimDueTasksBatch): Promise<ClaimedTask[]>;

	/** Record that a claimed task actually began executing (sets `startedAt`). */
	markStarted(claim: ClaimedTaskRef): Promise<number>;

	/** Terminal success. */
	completeTask(claim: ClaimedTaskRef): Promise<number>;

	/** Terminal failure (no attempts left). */
	failTaskTerminal(claim: ClaimedTaskRef, errorMessage: string): Promise<number>;

	/**
	 * A failed attempt with attempts left: back to `pending`, `runAt` pushed
	 * `backoffMs` forward, the attempt counted.
	 */
	rescheduleTask(claim: ClaimedTaskRef, backoffMs: number, errorMessage: string): Promise<number>;

	/** Return a claimed-but-unfired task to `pending` without counting an attempt. */
	releaseClaim(claim: ClaimedTaskRef): Promise<number>;
}
