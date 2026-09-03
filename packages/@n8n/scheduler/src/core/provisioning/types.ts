import type { ScheduleDefinition } from '@n8n/constants';

// Re-exported so a caller of the provisioning API needs one import for a job and
// its schedule.
export type {
	ScheduleDefinition,
	CronDefinition,
	RecurringCronDefinition,
	IntervalDefinition,
	OneOffDefinition,
} from '@n8n/constants';

/**
 * A job the caller wants persisted in a scope.
 * `name` is stable within that scope, so the same rule maps to the same row across re-registrations.
 * That stability is what lets an unchanged job keep its id (and its queued tasks).
 */
export interface DesiredJob {
	name: string;
	schedule: ScheduleDefinition;
	/** The seeded next run (its clock). `null` for a rule that must never fire. */
	firstRunAt: Date | null;
}

/**
 * An existing job in the scope, as provisioning needs it to diff by name.
 */
export interface ExistingJob {
	id: number;
	name: string;
	schedule: ScheduleDefinition;
	/** Whether the row carries a live clock (`nextRunAt !== null`) right now. */
	hasClock: boolean;
}

/**
 * One job a provision touched, identified by its stored id and its name. The
 * name is what makes a touched job legible (an id is an opaque autoincrement),
 * so a caller (or a trace) can tell which rule changed without a second lookup.
 */
export interface ProvisionedJob {
	id: number;
	name: string;
}

/**
 * What one provision touched, each job carried as an {@link ProvisionedJob}.
 */
export interface ProvisionSummary {
	/**
	 * Jobs this call actually inserted: the durable flow starts here for them.
	 * Under a concurrent first activation of the same scope, the losing main's
	 * inserts are skipped, so this can be shorter than the rules planned.
	 * It reports the rows this call wrote, not the scope's final row count.
	 */
	inserted: ProvisionedJob[];
	/** Jobs rewritten in place (id kept), their still-pending tasks withdrawn. */
	redefined: ProvisionedJob[];
	/** Jobs left untouched (id kept), so their queued fires still stand. */
	unchanged: ProvisionedJob[];
	/** Jobs deleted (their tasks cascaded away). */
	removed: ProvisionedJob[];
}
