import { backoff } from '../executor/backoff';

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
 * One expired-lease row the sweep decides on: only the fields the loop reads. The
 * storage layer's full task row has these and more, so it fits without adapting.
 */
export interface ExpiredLeaseRow {
	id: string;
	attempts: number;
	maxAttempts: number;
	leaseEpoch: number;
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
 * One pass reclaims (or dead-letters) up to `batchSize` expired-lease tasks: a task
 * with attempts left goes back to `pending` with a backoff and a bumped epoch; one
 * at its last attempt fails terminally. Returns the counts.
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
			if (nextAttempts >= task.maxAttempts) {
				const affected = await store.deadLetterExpired(
					{ id: task.id, claimedEpoch: task.leaseEpoch },
					LEASE_EXPIRED_MESSAGE,
				);
				deadLettered += affected;
				// Only an update that actually won the row is a dead-letter; a lost
				// race means another actor decided the row and there is nothing to report.
				if (affected > 0) {
					try {
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
				reclaimed += await store.reclaimExpired(
					{ id: task.id, claimedEpoch: task.leaseEpoch },
					backoff(nextAttempts),
					LEASE_EXPIRED_MESSAGE,
				);
			}
		} catch (error) {
			try {
				hooks.onRowError?.(task.id, error);
			} catch {
				// The remaining rows still need recovering.
			}
		}
	}

	return { reclaimed, deadLettered };
}
