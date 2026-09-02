import {
	DEFAULT_MISFIRE_GRACE_SECONDS,
	ScheduledJobMisfirePolicy,
	type OneOffDefinition,
	type ScheduleDefinition,
} from '@n8n/constants';
import { Service, type Constructable } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

/** Whether a run is safe to repeat. */
export type SystemTaskEffects = 'idempotent' | 'non-idempotent';

/** A system task always has a next run, so a one-off schedule is not allowed. */
export type SystemTaskSchedule = Exclude<ScheduleDefinition, OneOffDefinition>;

/**
 * A periodic background task owned by the system rather than by a workflow.
 */
export interface SystemTask {
	/**
	 * Identity of the task, unique across all system tasks. Registration sees
	 * only the class, so the consumer that resolves the instances has to enforce
	 * this.
	 */
	readonly name: string;

	readonly schedule: SystemTaskSchedule;

	/** What kind of effects a run has, which sets the defaults of the overrides below. */
	readonly effects: SystemTaskEffects;

	/**
	 * Migration status.
	 * - `false` runs on the leader-gated in-memory timer
	 * - `true` runs on the durable scheduler when the instance flag is on.
	 * @remarks Temporary, removed once every task is durable.
	 */
	readonly durable: boolean;

	/**
	 * Runs one occurrence as soon as this instance becomes the leader, on top
	 * of the scheduled occurrences. In-memory timers only: ignored for a
	 * durable run.
	 */
	readonly runOnTakeover?: boolean;

	/**
	 * How long after a failed run an earlier retry occurrence runs, instead of
	 * waiting for the next scheduled one. In-memory timers only, and only
	 * honored for idempotent work. Durable runs retry via `maxAttempts`.
	 * An integer of at least 1, capped at what a timeout honors (about 24 days).
	 */
	readonly retryDelaySeconds?: number;

	/**
	 * Overrides what happens to occurrences that missed their grace window.
	 * Defaults to `coalesce` for idempotent work and `skip` otherwise.
	 */
	readonly misfirePolicy?: ScheduledJobMisfirePolicy;

	/**
	 * Overrides how late an occurrence may run before the misfire policy applies.
	 * At least 1: a grace of `0` leaves every occurrence past its deadline the
	 * instant it comes due.
	 * Defaults to {@link DEFAULT_MISFIRE_GRACE_SECONDS}.
	 */
	readonly misfireGraceSeconds?: number;

	/**
	 * Overrides how many times an occurrence is attempted before it is given up on.
	 * Defaults to 3 for idempotent work. Ignored for non-idempotent work, which is
	 * always kept to a single attempt.
	 */
	readonly maxAttempts?: number;

	/**
	 * Executes one occurrence of the task. `signal` aborts when the run should
	 * stop early: the instance is shutting down or, for a run on the in-memory
	 * timer, leadership was lost. Honoring it is optional, but a run that
	 * ignores it delays stepdown and shutdown until it settles.
	 */
	run(signal: AbortSignal): Promise<void>;
}

/** How a task's occurrences are retried and how late they may still run. */
export interface SystemTaskRunOptions {
	misfirePolicy: ScheduledJobMisfirePolicy;
	misfireGraceSeconds: number;
	maxAttempts: number;
}

/**
 * Run options a task's effects imply, when the task declares no override:
 * retries and late runs only where a repeat is harmless.
 * The grace window does not depend on effects, so every task defaults to
 * {@link DEFAULT_MISFIRE_GRACE_SECONDS}.
 */
const SYSTEM_TASK_RUN_OPTION_DEFAULTS: Record<
	SystemTaskEffects,
	Omit<SystemTaskRunOptions, 'misfireGraceSeconds'>
> = {
	idempotent: {
		misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		maxAttempts: 3,
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'non-idempotent': {
		misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		maxAttempts: 1,
	},
};

/**
 * Resolves the run options a task is scheduled with, and rejects values the
 * scheduler cannot store. A task's own overrides win over the defaults its
 * effects imply, except for `maxAttempts` on non-idempotent work, which stays
 * at a single attempt.
 */
export function resolveSystemTaskRunOptions(task: SystemTask): SystemTaskRunOptions {
	const defaults = SYSTEM_TASK_RUN_OPTION_DEFAULTS[task.effects];

	const options = {
		misfirePolicy: task.misfirePolicy ?? defaults.misfirePolicy,
		misfireGraceSeconds: task.misfireGraceSeconds ?? DEFAULT_MISFIRE_GRACE_SECONDS,
		maxAttempts: task.effects === 'non-idempotent' ? 1 : (task.maxAttempts ?? defaults.maxAttempts),
	};

	// Both end up in `int` columns, where a fractional value is rounded and anything
	// above the signed 32-bit maximum is rejected, and an override of `0` passes the
	// `??` above. `scheduled_job` rejects a grace of `0` outright, so match the
	// column's whole range here rather than at the failing insert.
	// Only a static floor: the scheduler's usable minimum depends on its configured
	// intervals, so whatever provisions a task still has to clamp against those.
	assertInRange(task.name, 'maxAttempts', options.maxAttempts, 1);
	assertInRange(task.name, 'misfireGraceSeconds', options.misfireGraceSeconds, 1);

	return options;
}

/** Ceiling of an `int` column, which is what both fields are stored in. */
const MAX_INT32 = 2_147_483_647;

function assertInRange(taskName: string, field: string, value: number, min: number) {
	if (Number.isInteger(value) && value >= min && value <= MAX_INT32) return;

	throw new UnexpectedError(
		`System task "${taskName}" declares ${field} as ${value}, but it must be an integer between ${min} and ${MAX_INT32}`,
	);
}

export type SystemTaskClass = Constructable<SystemTask>;

/**
 * Class decorator that makes a system task class injectable. Registration is
 * explicit: a backend module returns the class from its `systemTasks()` hook,
 * and anything else hands it to `SystemTaskMetadata` directly.
 *
 * @example
 *
 * ```ts
 * @SystemTask()
 * class JtiCleanupTask implements SystemTask {
 *   // ...
 * }
 * ```
 */
export const SystemTask =
	() =>
	<T extends SystemTaskClass>(target: T): T => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		Service()(target);
		return target;
	};
