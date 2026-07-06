/**
 * The allocated unit of work. Coordination (the scheduler's core) claims, leases,
 * and runs each `ScheduledTask` exactly once on one main; recurrence is just one
 * way these come to exist.
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
