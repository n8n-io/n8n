import type { RecurringCronUnit } from '@n8n/constants';

/**
 * When a job runs, minus its identity and clock: the schedule half of a scheduled job.
 * Comparing two of these (plus clock liveness) is what tells provisioning whether a job's schedule changed.
 */
export type ScheduleDefinition =
	| CronDefinition
	| RecurringCronDefinition
	| IntervalDefinition
	| OneOffDefinition;

/** A cron expression evaluated in a timezone (`null` means the instance default). */
export interface CronDefinition {
	kind: 'cron';
	cronExpression: string;
	timezone: string | null;
}

/** A cron expression gated to fire only every Nth period. */
export interface RecurringCronDefinition {
	kind: 'recurring_cron';
	cronExpression: string;
	timezone: string | null;
	recurrenceUnit: RecurringCronUnit;
	recurrenceSize: number;
}

/** A fixed elapsed-time cadence; no timezone by design. */
export interface IntervalDefinition {
	kind: 'interval';
	intervalSeconds: number;
}

/** A single fire at a fixed instant, then never again. */
export interface OneOffDefinition {
	kind: 'one_off';
	fireAt: Date;
}

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
