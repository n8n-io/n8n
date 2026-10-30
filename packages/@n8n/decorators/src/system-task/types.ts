import type { InstanceType, OneOffDefinition, ScheduleDefinition } from '@n8n/constants';

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

	/** Where the occurrences run, and the options of the runner that runs them. */
	readonly target: SystemTaskTarget;

	/**
	 * Executes one occurrence of the task.
	 * `signal` aborts on shutdown, and on loss of leadership for a leader timer.
	 * A scheduler run also aborts on lease loss or expiry, and at its timeout.
	 * Ignoring the signal delays shutdown and can let another run overlap.
	 */
	run(signal: AbortSignal): Promise<void>;
}

/**
 * Where a task's occurrences run.
 *
 * A cluster task runs once for the whole cluster, on a main. It runs on the
 * durable scheduler when the scheduler is enabled, and on the leader timer
 * otherwise. An instance task runs in every instance of the types it names,
 * on a timer, with no coordination.
 */
export type SystemTaskTarget = ClusterTarget | LeaderTimerTarget | InstanceTarget;

/** A cluster task that runs on the durable scheduler. */
export interface ClusterTarget {
	readonly scope: 'cluster';
	readonly scheduler: SchedulerOptions;
	/**
	 * @deprecated Applies only while the durable scheduler is disabled.
	 * Removed when the durable scheduler is the only runner.
	 */
	readonly leaderTimer?: LeaderTimerOptions;
	readonly instanceTypes?: never;
}

/** A cluster task that runs on the leader timer only. */
export interface LeaderTimerTarget {
	readonly scope: 'cluster';
	readonly scheduler?: never;
	readonly leaderTimer: LeaderTimerOptions;
	readonly instanceTypes?: never;
}

/** A task that runs in every instance of the types it names. */
export interface InstanceTarget {
	readonly scope: 'instance';
	readonly instanceTypes: readonly [InstanceType, ...InstanceType[]];
	readonly scheduler?: never;
	readonly leaderTimer?: never;
}

/** What the durable scheduler stores for a task and honors on every occurrence. */
export interface SchedulerOptions {
	/**
	 * Runs an occurrence again when its run throws, times out or loses its
	 * lease, up to three runs in all. Set `false` when running twice for one
	 * occurrence is not safe.
	 */
	readonly retryOnFailure: boolean;

	/**
	 * How many seconds after its planned time an occurrence may still start.
	 * After this, the occurrence is missed and does not run. Only `catchUp` can
	 * run the latest occurrence that was missed while the scheduler was down.
	 * Defaults to 60.
	 */
	readonly missedAfterSeconds?: number;

	/** After the scheduler was down, runs the latest missed occurrence once. Defaults to `true`. */
	readonly catchUp?: boolean;

	/** How many occurrences may run at the same time. Defaults to 1. */
	readonly concurrencyLimit?: number | 'unlimited';

	/**
	 * How many seconds one run may take. At this limit the signal aborts.
	 * Rounded to the whole second, never below one, at most about 24 days.
	 * Defaults to the scheduler's task timeout.
	 */
	readonly timeoutSeconds?: number;
}

/** What the leader timer honors. */
export interface LeaderTimerOptions {
	/** Runs one occurrence as soon as this main becomes the leader, on top of the schedule. */
	readonly runOnTakeover?: boolean;

	/**
	 * How long after a failed run the task runs again, instead of at its next
	 * occurrence. An integer from 1 to about 24 days.
	 */
	readonly retryDelaySeconds?: number;
}
