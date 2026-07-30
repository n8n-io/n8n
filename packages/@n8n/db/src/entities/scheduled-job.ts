import type { ScheduledJobKind, RecurringCronUnit } from '@n8n/constants';
import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { DateTimeColumn, JsonColumn, WithTimestamps } from './abstract-entity';

export { ScheduledJobKind, ScheduledJobKindList } from '@n8n/constants';

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
@Index(['workflowId'], { where: '"workflowId" IS NOT NULL' })
@Index(['name'], { unique: true })
export class ScheduledJob extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	/**
	 * Human-readable job name, unique across all jobs.
	 * A well-known scheduler key for system jobs (e.g. a maintenance job);
	 * generated for jobs owned by a workflow trigger.
	 */
	@Column({ type: 'varchar', length: 255 })
	name: string;

	/**
	 * Workflow this job belongs to,
	 * referenced via its published version
	 * (only published trigger nodes get scheduled).
	 * `null` for well-known system jobs that aren't tied to a workflow.
	 * Unpublishing the workflow cascades its jobs away.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;

	/**
	 * Trigger node within the workflow that owns this job.
	 * `null` for non-trigger jobs.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	nodeId: string | null;

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
	 * Last time an occurrence was materialized,
	 * used to recompute {@link nextRunAt}.
	 */
	@DateTimeColumn({ nullable: true })
	lastFiredAt: Date | null;

	/**
	 * Retry ceiling copied onto each occurrence this job materializes.
	 */
	@Column({ type: 'int', default: 1 })
	maxAttempts: number;
}
