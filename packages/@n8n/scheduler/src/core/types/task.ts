/**
 * The allocated unit of work. Coordination (the scheduler's core) claims and
 * leases each `ScheduledTask` so no two instances *claim* it at once; recurrence
 * is just one way these come to exist.
 *
 * The contract is at-least-once: a crashed or lease-lapsed attempt is redelivered
 * rather than dropped, because a lost run is worse than a duplicate one (an attempt
 * that exhausts its retries is dead-lettered). So the claim is not exactly-once: an
 * owner stalled past its lease can still be inside its handler while the reaper
 * reclaims the row and another instance claims it, and a redelivery runs the
 * handler again. Duplicate *effects* are suppressed best-effort by the partial
 * unique index on `execution_entity.deduplicationKey` (see `ExecutionEntity` in
 * `@n8n/db`). Handlers must therefore be idempotent per occurrence. Tightening the
 * duplicate-suppression semantics is deferred to the misfire-policy work.
 *
 * Both types carry only the fields the core reads, named and typed as the
 * `scheduled_task` columns, so the storage row satisfies them structurally and
 * no mapper sits between the database and the core. Instants are `Date`
 * (absolute UTC).
 */

import type { ScheduledTaskStatus } from '@n8n/constants';

/**
 * A materialised occurrence of a job (`scheduled_task`): one queued run.
 *
 * `scheduledFor` is the canonical UTC occurrence instant and the identity (unique
 * on `(jobId, scheduledFor)`); `runAt` is the visibility time (equal to
 * `scheduledFor` initially, pushed forward by retry backoff).
 */
export interface ScheduledTask {
	id: string;
	jobId: number;
	taskType: string;
	payload: Record<string, unknown>;
	scheduledFor: Date;
	runAt: Date;
	status: ScheduledTaskStatus;
	attempts: number;
	maxAttempts: number;
}

/**
 * A `ScheduledTask` the executor has claimed: `running` and owned for the lease's
 * duration. `leaseEpoch` is the fence every terminal write is guarded on; the
 * owner and lease-expiry columns exist on the row but the executor never reads
 * them, so they are not part of this contract.
 */
export interface ClaimedTask extends ScheduledTask {
	leaseEpoch: number;
}
