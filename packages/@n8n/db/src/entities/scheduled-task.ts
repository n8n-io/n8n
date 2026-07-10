import { ScheduledTaskStatus } from '@n8n/constants';
import { Column, Entity, Generated, Index, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, JsonColumn, WithCreatedAt, dbType } from './abstract-entity';
import { idStringifier } from '../utils/transformers';

// Defined in `@n8n/constants` (shared with `@n8n/scheduler`), re-exported here
// so the schema side keeps exposing its vocabulary.
export {
	ScheduledTaskStatus,
	ScheduledTaskStatusList,
	type TerminalTaskStatus,
	TerminalTaskStatusList,
} from '@n8n/constants';

/**
 * One concrete run of a {@link ScheduledJob} at a specific time.
 *
 * When the scheduler decides a job is due, it creates a row here.
 * A worker then picks the row up, runs it, and records the outcome.
 * Each row tracks
 * - its own progress (see {@link status}),
 * - how many times it has been tried ({@link attempts}),
 * - and who is currently running it ({@link claimedBy} and the lease columns)
 *
 * "Claiming" a row means a worker briefly reserves it
 * so two workers don't run the same task at once.
 *
 * That reservation (a "lease") expires after a while,
 * so if the worker dies mid-run another worker can take over.
 */
@Entity({ name: 'scheduled_task' })
@Index(['jobId', 'scheduledFor'], { unique: true })
@Index(['runAt'], { where: '"status" = \'pending\'' })
@Index(['leaseExpiresAt'], { where: '"status" = \'running\'' })
@Index(['finishedAt'], { where: '"finishedAt" IS NOT NULL' })
export class ScheduledTask extends WithCreatedAt {
	/**
	 * 64-bit identity.
	 * This table is a high-churn queue: every time a job fires it inserts a row,
	 * and the auto-increment counter never reuses values
	 * (retention deletes old rows but the counter keeps climbing).
	 *
	 * Per engine: Postgres uses bigint IDENTITY; SQLite uses INTEGER PRIMARY KEY
	 * (the rowid alias, already 64-bit and auto-generating).
	 */
	@Generated()
	@PrimaryColumn({
		type: dbType === 'sqlite' ? 'integer' : 'bigint',
		transformer: idStringifier,
	})
	id: string;

	@Column({ type: 'int' })
	jobId: number;

	/**
	 * What kind of work to run, copied from the job's taskType when this run is
	 * created rather than read back through {@link jobId}.
	 *
	 * This denormalization (together with {@link payload}) makes a run self-contained:
	 * - a worker has everything it needs to execute it without joining back to scheduled_job, which keeps the claim hot path simple,
	 * - and the run stays a stable snapshot that isn't affected if the job is later edited or removed.
	 *
	 * It also future-proofs the design: because a run already carries its own taskType and payload,
	 * tasks can be enqueued directly without a parent job (e.g. ad-hoc one-off work).
	 *
	 * That path isn't enabled yet ({@link jobId} is currently required), but the schema won't need reworking to allow it.
	 */
	@Column({ type: 'varchar', length: 128 })
	taskType: string;

	/**
	 * Input for the handler, copied from the job's payload when this run is
	 * created.
	 *
	 * Like {@link taskType} it's a snapshot,
	 * so editing the job later doesn't change runs that are already queued.
	 *
	 * See {@link taskType} for why these two are denormalized.
	 */
	@JsonColumn({ default: '{}' })
	payload: Record<string, unknown>;

	/**
	 * The time this run is for (the slot the job was due).
	 * Together with {@link jobId} it identifies the run,
	 * so the same job and time can't be queued twice.
	 */
	@DateTimeColumn()
	scheduledFor: Date;

	/**
	 * Earliest time a worker may pick this run up.
	 * Starts equal to {@link scheduledFor}.
	 * If a try fails it is pushed later so the retry waits a bit before running again.
	 */
	@DateTimeColumn()
	runAt: Date;

	/**
	 * Where this run is in its lifecycle.
	 * Workers look for `pending` rows to start,
	 * and the cleanup pass looks at `running` rows to recover stalled ones.
	 */
	@Column({ type: 'varchar', length: 16, default: ScheduledTaskStatus.Pending })
	status: ScheduledTaskStatus;

	/**
	 * How many times a worker has started this run so far, checked against {@link maxAttempts}.
	 */
	@Column({ type: 'int', default: 0 })
	attempts: number;

	/**
	 * The most times this run may be tried before it is given up on.
	 * Once {@link attempts} reaches it, a failure is final instead of retried.
	 *
	 * The default of 1 means a single try. If a worker crashes mid-run, that crash
	 * uses up the only attempt, so the run is given up on without ever finishing.
	 * Where a run must not be lost this way, claim logic should raise this, or tell
	 * a crash apart from a real failure of the task itself.
	 */
	@Column({ type: 'int', default: 1 })
	maxAttempts: number;

	/**
	 * Which worker is currently running this;
	 * `null` when no one has claimed it.
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	claimedBy: string | null;

	/**
	 * When the current worker's claim runs out.
	 * If this passes while the run is still `running`,
	 * the cleanup pass assumes the worker died and frees the run for another to take.
	 *
	 * `null` while the run is unclaimed (`pending`) or finished. A DB CHECK
	 * (`CHK_scheduled_task_running_lease`) enforces that a `running` row always has
	 * one, so the reaper never finds a claimed run with no expiry to reclaim it by.
	 */
	@DateTimeColumn({ nullable: true })
	leaseExpiresAt: Date | null;

	/**
	 * A counter bumped each time the run is claimed.
	 * It lets a worker notice it has lost the run: if its claim expired and someone else took over, the counter
	 * has moved on, so the old worker knows not to write its now-stale result.
	 */
	@Column({ type: 'int', default: 0 })
	leaseEpoch: number;

	/**
	 * When the current try started running.
	 */
	@DateTimeColumn({ nullable: true })
	startedAt: Date | null;

	/**
	 * When this run finished, whether it succeeded or failed.
	 * Used to clean up old rows.
	 */
	@DateTimeColumn({ nullable: true })
	finishedAt: Date | null;

	/**
	 * Why the last try failed, if it did.
	 */
	@Column({ type: 'text', nullable: true })
	errorMessage: string | null;
}
