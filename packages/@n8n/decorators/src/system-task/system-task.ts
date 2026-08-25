import {
	DEFAULT_MISFIRE_GRACE_SECONDS,
	ScheduledJobMisfirePolicy,
	type OneOffDefinition,
	type ScheduleDefinition,
} from '@n8n/constants';
import { Container, Service, type Constructable } from '@n8n/di';

import { SystemTaskMetadata } from './system-task-metadata';

/**
 * Whether a run is safe to repeat.
 * - 'Idempotent' work can run twice without harm,
 * - 'Non-idempotent' work must not be duplicated
 */
export type SystemTaskEffects = 'idempotent' | 'non-idempotent';

export type SystemTaskSchedule = Exclude<ScheduleDefinition, OneOffDefinition>;

/**
 * A periodic background task owned by the system rather than by a workflow.
 */
export interface SystemTask {
	/**
	 * Identity of the task, unique across all system tasks.
	 * Registration only sees the class, so the consumer that resolves the
	 * instances is what enforces this.
	 */
	readonly name: string;

	/** When the task runs. */
	readonly schedule: SystemTaskSchedule;

	/**
	 * What kind of effects a run has. The defaults of the overrides below
	 * derive from this.
	 */
	readonly effects: SystemTaskEffects;

	/**
	 * Migration status.
	 * - `false` runs on the leader-gated in-memory timer
	 * - `true` runs on the durable scheduler when the instance flag is on.
	 * @remarks Temporary, removed once every task is durable.
	 */
	readonly durable: boolean;

	/**
	 * Overrides what happens to occurrences that missed their grace window.
	 * Defaults to `coalesce` for idempotent work and `skip` otherwise.
	 */
	readonly misfirePolicy?: ScheduledJobMisfirePolicy;

	/**
	 * Overrides how late an occurrence may run before the misfire policy applies.
	 * Defaults to {@link DEFAULT_MISFIRE_GRACE_SECONDS}.
	 */
	readonly misfireGraceSeconds?: number;

	/**
	 * Overrides how many times an occurrence is attempted before it is given up on.
	 * Defaults to 3 for idempotent work and 1 otherwise.
	 */
	readonly maxAttempts?: number;

	/** Executes one occurrence of the task. */
	run(): Promise<void>;
}

/** How a task's occurrences are retried and how late they may still run. */
export interface SystemTaskRunOptions {
	misfirePolicy: ScheduledJobMisfirePolicy;
	misfireGraceSeconds: number;
	maxAttempts: number;
}

/**
 * Run options implied by a task's effects, when the task declares no override.
 * Idempotent work may be retried and may run late, non-idempotent work may not.
 */
const SYSTEM_TASK_RUN_OPTION_DEFAULTS: Record<SystemTaskEffects, SystemTaskRunOptions> = {
	idempotent: {
		misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		misfireGraceSeconds: DEFAULT_MISFIRE_GRACE_SECONDS,
		maxAttempts: 3,
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'non-idempotent': {
		misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		misfireGraceSeconds: DEFAULT_MISFIRE_GRACE_SECONDS,
		maxAttempts: 1,
	},
};

/**
 * Resolves the run options a task will be scheduled with. A task's own overrides
 * win over the defaults its effects imply.
 */
export function resolveSystemTaskRunOptions(task: SystemTask): SystemTaskRunOptions {
	const defaults = SYSTEM_TASK_RUN_OPTION_DEFAULTS[task.effects];

	return {
		misfirePolicy: task.misfirePolicy ?? defaults.misfirePolicy,
		misfireGraceSeconds: task.misfireGraceSeconds ?? defaults.misfireGraceSeconds,
		maxAttempts: task.maxAttempts ?? defaults.maxAttempts,
	};
}

export type SystemTaskClass = Constructable<SystemTask>;

/**
 * Class decorator that registers a system task in {@link SystemTaskMetadata}
 * and makes the class injectable.
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
		Container.get(SystemTaskMetadata).register(target);
		return target;
	};
