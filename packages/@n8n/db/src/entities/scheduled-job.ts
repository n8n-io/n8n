import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { ScheduledJobKind, RecurringCronUnit } from '@n8n/constants';
import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { DateTimeColumn, JsonColumn, WithTimestamps } from './abstract-entity';

export { ScheduledJobKind, ScheduledJobKindList } from '@n8n/constants';
export { ScheduledJobMisfirePolicy, ScheduledJobOwnerType } from '@n8n/constants';

/**
 * A scheduled job: the rule for when something should run,
 * plus the bookkeeping the scheduler needs to act on it.
 *
 * A job answers "what runs, and when".
 *
 * For example "run workflow X every day at 9am", or "run this once at midnight".
 * The row holds the timing rule (see {@link kind} and the schedule columns),
 * whether it is currently active ({@link enabled}),
 * and when it last fired and is next due.
 *
 * The job itself never executes anything.
 *
 * A background scheduler periodically scans the active jobs that are due and,
 * for each one, inserts a concrete row into `scheduled_task` representing a single run at a specific time.
 * Those task rows are what actually get picked up and run.
 */
@Entity({ name: 'scheduled_job' })
@Index(['nextRunAt'], {
	where: '"enabled" = true AND "nextRunAt" IS NOT NULL',
})
// Not unique: one member can own several jobs. Owner-wide queries use the
// leftmost prefix, the third column covers the per-member provisioning diff.
@Index(['ownerType', 'ownerId', 'ownerMemberId'])
@Index(['name'], { unique: true })
export class ScheduledJob extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	/**
	 * Human-readable job name, unique across all jobs, and the key provisioning
	 * matches existing rows on.
	 */
	@Column({ type: 'varchar', length: 255 })
	name: string;

	/**
	 * What kind of thing owns this job, e.g. `'workflow'` or `'system-task'`
	 * (see `ScheduledJobOwnerType`).
	 *
	 * A plain string, not an enum: the scheduler only ever compares it, so a new
	 * kind of owner needs no schema change.
	 */
	@Column({ type: 'varchar', length: 32 })
	ownerType: string;

	/**
	 * Which owner of that kind: a workflow id, a system task name, an agent id.
	 *
	 * Deleting the owner does not delete this row. The owning module must
	 * deprovision explicitly, with the reconciliation sweep as the backstop.
	 */
	@Column({ type: 'varchar', length: 255 })
	ownerId: string;

	/**
	 * Which part of the owner, e.g. a workflow's trigger node id. `null` when the
	 * owner has no parts.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	ownerMemberId: string | null;

	/**
	 * What kind of work this job runs.
	 * The scheduler is generic, so this is how it knows what to do when the job
	 * fires, e.g. `'workflow:schedule-trigger'` for a workflow's schedule trigger.
	 * Paired with {@link payload}, which carries the handler's input.
	 */
	@Column({ type: 'varchar', length: 128 })
	taskType: string;

	/**
	 * Input handed to the task handler when an occurrence runs.
	 */
	@JsonColumn({ default: '{}' })
	payload: Record<string, unknown>;

	@Column({ type: 'varchar', length: 16 })
	kind: ScheduledJobKind;

	/**
	 * Cron expression driving recurrence.
	 * Set when {@link kind} is `cron` or `recurring_cron`.
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	cronExpression: string | null;

	/**
	 * IANA timezone the cron expression is evaluated in.
	 * `null` falls back to the instance default.
	 */
	@Column({ type: 'varchar', length: 64, nullable: true })
	timezone: string | null;

	/**
	 * Gap between fires in seconds.
	 * Set only when {@link kind} is `interval`.
	 */
	@Column({ type: 'int', nullable: true })
	intervalSeconds: number | null;

	/**
	 * Absolute time the job fires once.
	 * Set only when {@link kind} is `one_off`.
	 */
	@DateTimeColumn({ nullable: true })
	fireAt: Date | null;

	/**
	 * Calendar period the every-Nth-period recurrence gate counts in.
	 * Set only when {@link kind} is `recurring_cron`.
	 */
	@Column({ type: 'varchar', length: 16, nullable: true })
	recurrenceUnit: RecurringCronUnit | null;

	/**
	 * How many periods between fires, e.g. 3 for "every 3 weeks".
	 * At least 2: a stride of 1 keeps every fire, which is just a plain `cron`.
	 * Set only when {@link kind} is `recurring_cron`.
	 */
	@Column({ type: 'int', nullable: true })
	recurrenceSize: number | null;

	@Column({ default: true })
	enabled: boolean;

	/**
	 * Next time an occurrence is due to be materialized.
	 * The scheduler's materializer reads this to find work.
	 * It's set to `null` once the job is disabled or a one-off has fired,
	 * which drops the row out of the materializer's index.
	 */
	@DateTimeColumn({ nullable: true })
	nextRunAt: Date | null;

	/**
	 * The latest instant the job's clock has advanced past. Not proof a run
	 * happened: a discarded occurrence still advances it.
	 */
	@DateTimeColumn({ nullable: true })
	lastFiredAt: Date | null;

	/**
	 * Retry ceiling copied onto each occurrence this job materializes.
	 */
	@Column({ type: 'int', default: 1 })
	maxAttempts: number;

	/** What happens to an occurrence overdue by more than {@link misfireGraceSeconds}. */
	@Column({ type: 'varchar', length: 16, default: ScheduledJobMisfirePolicy.Coalesce })
	misfirePolicy: ScheduledJobMisfirePolicy;

	/**
	 * How late an occurrence may still be and count as on time, so that an ordinary
	 * restart or a slow pass never reaches {@link misfirePolicy}.
	 *
	 * Copied from {@link SchedulerConfig.misfireGraceSeconds} onto each row rather than
	 * read live, so every instance agrees on one job's deadline through a rolling
	 * config change.
	 *
	 * Pinned to a literal, not the shared constant, so a later change to the
	 * constant can't retroactively change what this entity declares.
	 */
	@Column({ type: 'int', default: 60 })
	misfireGraceSeconds: number;

	/**
	 * When the reconciliation sweep last found this job's owner gone. `null`
	 * while the owner is alive.
	 *
	 * A quarantine marker, not a delete: the job's clock is cleared first and it
	 * is only deleted once the stamp is older than the quarantine grace, leaving
	 * a window for a wrong liveness answer to be corrected.
	 */
	@DateTimeColumn({ nullable: true })
	orphanedAt: Date | null;
}

/** Who a scheduled job belongs to: a kind of owner, an owner, and a part of it. */
export interface ScheduledJobOwner {
	ownerType: string;
	ownerId: string;
	ownerMemberId: string | null;
}

/** An owner without a member: every job that owner holds, whichever part made it. */
export type ScheduledJobOwnerRef = Pick<ScheduledJobOwner, 'ownerType' | 'ownerId'>;
