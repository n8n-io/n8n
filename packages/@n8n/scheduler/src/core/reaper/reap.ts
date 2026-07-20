import { backoff } from '../executor/backoff';
import type { ClaimedTask } from '../types';

/** Recorded on a task the reaper recovers, so the failure has a cause. */
const LEASE_EXPIRED_MESSAGE = 'Lease expired before completion';

/** Outcome of one sweep, for observability and tests. */
export interface ReapResult {
	/** Tasks returned to `pending` for another attempt. */
	reclaimed: number;
	/** Tasks failed terminally (no attempts left). */
	deadLettered: number;
}

/** Identifies the row and the epoch read during the sweep, for a guarded reaper update. */
export interface ExpiredLeaseRef {
	id: string;
	claimedEpoch: number;
}

/**
 * One expired-lease row the sweep decides on. It carries the full claimed-task
 * shape plus `dispatchedAt`, the effect-boundary marker: `null` means the owner
 * was lost before dispatch, so the occurrence's effect never happened. The storage
 * layer's full task row has these and more, so it fits without adapting.
 */
export interface ExpiredLeaseRow extends ClaimedTask {
	dispatchedAt: Date | null;
}

/**
 * The store operations a sweep needs, defined here as the reaper's own surface so
 * it depends on nothing concrete. `ScheduledTaskRepository` structurally satisfies
 * this, so no adapter is needed at the call site.
 */
export interface ReaperTaskStore {
	findExpiredLeases(limit: number): Promise<ExpiredLeaseRow[]>;
	reclaimExpired(ref: ExpiredLeaseRef, backoffMs: number, errorMessage: string): Promise<number>;
	deadLetterExpired(ref: ExpiredLeaseRef, errorMessage: string): Promise<number>;
	/**
	 * Terminally complete a post-dispatch expired lease as `succeeded`: its effect
	 * already happened, so it must not be recorded failed nor dispatched again.
	 */
	completeExpired(ref: ExpiredLeaseRef): Promise<number>;
}

/** Knobs of one reaper sweep. */
export interface ReaperOptions {
	/** The most expired-lease tasks one sweep recovers. */
	batchSize: number;
}

export const DEFAULT_REAPER_OPTIONS: ReaperOptions = {
	batchSize: 100,
};

/** Notifications a sweep emits; all optional, none may affect the sweep's outcome. */
export interface ReaperHooks {
	/** Notified when recovering one expired-lease row fails, after the row is skipped. */
	onRowError?: (taskId: string, error: unknown) => void;
	/** Notified when a task is failed terminally: the lease of its last attempt expired. */
	onDeadLetter?: (task: { taskId: string; attempts: number; maxAttempts: number }) => void;
	/**
	 * Notified when a post-dispatch task's lease lapsed on its last attempt and it was
	 * completed as succeeded (its effect had already happened) instead of failed.
	 */
	onCompletedAfterDispatch?: (task: { taskId: string }) => void;
}

/**
 * Recovers tasks stranded `running` by an instance that crashed or stalled past
 * its lease. Runs on every main; a driver (the multi-main loop) calls `reap` on a
 * cadence.
 *
 * The sweep reads expired-lease rows and decides per row, reusing the shared
 * {@link backoff} curve so a lease-expiry retry waits as long as a handler-failure
 * retry would. Reclaim returns the row to `pending`; a stalled original owner is
 * fenced first by the `status = 'running'` guard (while the row is `pending`) and
 * then by the epoch, which the next claim bumps. Reclaim also bumps the epoch
 * itself as an extra safeguard against a second concurrent reaper, but the
 * `status` change and the next claim's own bump are what actually close the
 * stalled-owner window (see `Executor`).
 *
 * Each per-row update is guarded and 0 rows affected is benign, so concurrent
 * reapers on every main are safe. A row that throws is skipped (reported via
 * `hooks.onRowError`), not allowed to abort the rest of the pass.
 *
 * One pass resolves up to `batchSize` expired-lease tasks, splitting first on the
 * effect boundary: a task the owner already dispatched is completed as succeeded
 * (its effect happened, so it is never redelivered), whatever its attempts. A
 * never-dispatched task with attempts left goes back to `pending` with a backoff and
 * a bumped epoch; one at its last attempt fails terminally. Returns the counts.
 *
 * Cancellation (`signal`, aborted when the driving loop times the pass out or
 * shuts down) is task-granular.
 */
export async function reap(
	store: ReaperTaskStore,
	options: ReaperOptions = DEFAULT_REAPER_OPTIONS,
	hooks: ReaperHooks = {},
	signal?: AbortSignal,
): Promise<ReapResult> {
	const expired = await store.findExpiredLeases(options.batchSize);
	// Stryker disable next-line ConditionalExpression: pure early-return optimisation;
	// without it the loop below is simply empty for an empty array, same result.
	if (expired.length === 0) return { reclaimed: 0, deadLettered: 0 };

	let reclaimed = 0;
	let deadLettered = 0;
	for (const task of expired) {
		if (signal?.aborted === true) {
			break;
		}
		// A row that keeps throwing must not abort the pass: rows sort oldest-first,
		// so it would head-of-line block every younger expired row on each sweep.
		try {
			// The expired lease means the in-flight attempt is lost, so count it now,
			// same as a handler failure would.
			const nextAttempts = task.attempts + 1;
			const ref = { id: task.id, claimedEpoch: task.leaseEpoch };
			// The effect boundary is the primary split, ahead of the attempt count: a row
			// the owner dispatched before losing its lease already had its effect happen, so
			// it is completed whatever the attempts left and never redelivered. Only a
			// never-dispatched row is reclaimed for another attempt or, on its last one,
			// dead-lettered.
			if (task.dispatchedAt !== null) {
				// Post-dispatch: complete as succeeded rather than record a failure for work
				// that was done, and never dispatch it again. A success, not a failure, so it
				// is not counted as dead-lettered; `onCompletedAfterDispatch` reports it.
				const affected = await store.completeExpired(ref);
				if (affected > 0) {
					try {
						// Stryker disable next-line OptionalChaining: the enclosing catch
						// already swallows a call on an undefined hook, same as `?.` skipping it.
						hooks.onCompletedAfterDispatch?.({ taskId: task.id });
					} catch {
						// A host-supplied reporter must not break the sweep it observes.
					}
				}
			} else if (nextAttempts >= task.maxAttempts) {
				// Never dispatched, last attempt: the effect never happened and no attempts
				// remain, so record the terminal failure. Guarded and epoch-fenced, and fenced
				// on `dispatchedAt` still being null: a marker that landed during the sweep
				// turns this into a benign no-op (the next sweep then completes the row) instead
				// of failing a dispatched occurrence. A lost race (0 rows) likewise means
				// another actor already resolved it.
				const affected = await store.deadLetterExpired(ref, LEASE_EXPIRED_MESSAGE);
				deadLettered += affected;
				if (affected > 0) {
					try {
						// Stryker disable next-line OptionalChaining: the enclosing catch
						// already swallows a call on an undefined hook, same as `?.` skipping it.
						hooks.onDeadLetter?.({
							taskId: task.id,
							attempts: nextAttempts,
							maxAttempts: task.maxAttempts,
						});
					} catch {
						// A host-supplied reporter must not break the sweep it observes.
					}
				}
			} else {
				reclaimed += await store.reclaimExpired(ref, backoff(nextAttempts), LEASE_EXPIRED_MESSAGE);
			}
		} catch (error) {
			try {
				// Stryker disable next-line OptionalChaining: the enclosing catch already
				// swallows a call on an undefined hook, same as `?.` skipping it.
				hooks.onRowError?.(task.id, error);
			} catch {
				// The remaining rows still need recovering.
			}
		}
	}

	return { reclaimed, deadLettered };
}
