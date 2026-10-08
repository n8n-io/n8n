import {
	DEFAULT_MISFIRE_GRACE_SECONDS,
	MAX_INTEGER_32BITS_SIGNED,
	MAX_TIMER_DELAY_SECONDS,
	ScheduledJobMisfirePolicy,
	Time,
	type IntervalDefinition,
} from '@n8n/constants';
import { Service, type Constructable } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type {
	SchedulerSystemTask,
	SystemTask as SystemTaskContract,
	SystemTaskSchedule,
} from './types';

export type SystemTask = SystemTaskContract;

/** How a task's occurrences are retried and how late they may still run. */
export interface SystemTaskRunOptions {
	misfirePolicy: ScheduledJobMisfirePolicy;
	misfireGraceSeconds: number;
	maxAttempts: number;
	/** `null` means no limit. */
	concurrencyLimit: number | null;
	/** `undefined` means the scheduler's task timeout. */
	timeoutSeconds: number | undefined;
}

/** One occurrence at a time, like the in-memory timer. */
export const DEFAULT_SYSTEM_TASK_CONCURRENCY_LIMIT = 1;

/** Whether the task runs on the durable scheduler while the scheduler is enabled. */
export function runsOnScheduler(task: SystemTask): task is SchedulerSystemTask {
	return task.target.scheduler !== undefined;
}

/**
 * Resolves the run options the scheduler stores for a task, and rejects values
 * it cannot store. Returns `undefined` for a task that does not run on the scheduler.
 *
 * @throws {UnexpectedError} when an option is out of range
 */
export function resolveSystemTaskRunOptions(task: SchedulerSystemTask): SystemTaskRunOptions;
export function resolveSystemTaskRunOptions(task: SystemTask): SystemTaskRunOptions | undefined;
export function resolveSystemTaskRunOptions(task: SystemTask): SystemTaskRunOptions | undefined {
	const { scheduler } = task.target;
	if (scheduler === undefined) {
		return undefined;
	}
	const concurrencyLimit = scheduler.concurrencyLimit ?? DEFAULT_SYSTEM_TASK_CONCURRENCY_LIMIT;

	const options = {
		misfirePolicy:
			scheduler.catchUp === false
				? ScheduledJobMisfirePolicy.Skip
				: ScheduledJobMisfirePolicy.Coalesce,
		misfireGraceSeconds: scheduler.missedAfterSeconds ?? DEFAULT_MISFIRE_GRACE_SECONDS,
		maxAttempts: scheduler.maxAttempts,
		concurrencyLimit: concurrencyLimit === 'unlimited' ? null : concurrencyLimit,
		timeoutSeconds: scheduler.timeoutSeconds,
	};

	// These end up in `int` columns, where a fractional value is rounded and anything
	// above the signed 32-bit maximum is rejected. `scheduled_job` rejects a grace of `0`
	// outright, so match the column's whole range here rather than at the failing insert.
	// Only a static floor: the scheduler's usable minimum depends on its configured
	// intervals, so whatever provisions a task still has to clamp against those.
	assertInRange(task.name, 'maxAttempts', options.maxAttempts, 1);
	assertInRange(task.name, 'missedAfterSeconds', options.misfireGraceSeconds, 1);
	// A limit below 1 would block every occurrence.
	if (options.concurrencyLimit !== null) {
		assertInRange(task.name, 'concurrencyLimit', options.concurrencyLimit, 1);
	}
	if (options.timeoutSeconds !== undefined) {
		assertInRange(task.name, 'timeoutSeconds', options.timeoutSeconds, 1, MAX_TIMER_DELAY_SECONDS);
	}

	return options;
}

/**
 * Rejects a task that declares an option the schedulers cannot honor.
 *
 * @throws {UnexpectedError} when `retryDelaySeconds` or a scheduler option is out of range
 * @throws {UnexpectedError} when an instance task declares an interval that is not positive and finite
 */
export function validateSystemTask(task: SystemTask): void {
	resolveSystemTaskRunOptions(task);

	const { target } = task;
	const retryDelaySeconds =
		target.scope === 'instance'
			? target.retryDelaySeconds
			: // oxlint-disable-next-line typescript/no-deprecated -- validated while the leader timer still runs tasks
				target.leaderTimer?.retryDelaySeconds;
	if (
		retryDelaySeconds !== undefined &&
		(!Number.isInteger(retryDelaySeconds) ||
			retryDelaySeconds < 1 ||
			retryDelaySeconds > MAX_TIMER_DELAY_SECONDS)
	) {
		throw new UnexpectedError('A system task declares an out-of-range retry delay', {
			extra: { name: task.name, retryDelaySeconds },
		});
	}

	// A cluster task's interval is rounded up to one second, but an instance
	// task's is kept to the millisecond, so a non-positive one would fire every millisecond.
	const { schedule } = task;
	if (
		target.scope === 'instance' &&
		schedule.kind === 'interval' &&
		!(schedule.intervalSeconds > 0 && Number.isFinite(schedule.intervalSeconds))
	) {
		throw new UnexpectedError(
			'A system task declares an interval that is not positive and finite',
			{
				extra: { name: task.name, intervalSeconds: schedule.intervalSeconds },
			},
		);
	}
}

/**
 * An interval schedule firing every `seconds`, rounded to the whole second.
 *
 * @throws {UnexpectedError} when `seconds` is negative or not a number
 */
export function intervalFromSeconds(seconds: number): IntervalDefinition {
	if (!(seconds >= 0)) {
		throw new UnexpectedError('A system task interval in seconds is negative or not a number', {
			extra: { seconds },
		});
	}
	return { kind: 'interval', intervalSeconds: Math.round(seconds) };
}

/**
 * The timeout of a durable run that another limit already stops: that limit plus
 * `marginSeconds`, rounded up to the whole second. A limit of 0 or less means the
 * run has no limit, so the timeout is the longest the scheduler enforces.
 */
export function timeoutAfterLimit(limitSeconds: number, marginSeconds: number): number {
	if (!(limitSeconds > 0)) {
		return MAX_TIMER_DELAY_SECONDS;
	}
	return Math.min(Math.ceil(limitSeconds + marginSeconds), MAX_TIMER_DELAY_SECONDS);
}

/** An interval schedule firing every `milliseconds`, rounded to the whole millisecond. */
export function intervalFromMilliseconds(milliseconds: number): IntervalDefinition {
	return {
		kind: 'interval',
		intervalSeconds: Math.round(milliseconds) / Time.seconds.toMilliseconds,
	};
}

/**
 * Resolves the schedule a task is planned with. A cluster task's interval is
 * rounded to the whole second the scheduler requires, so a cadence derived from
 * a fractional config value keeps running as it did on the legacy timers. An
 * instance task's interval keeps its sub-second part, rounded to the millisecond.
 */
export function resolveSystemTaskSchedule(task: SystemTask): SystemTaskSchedule {
	const { schedule } = task;
	if (schedule.kind !== 'interval') {
		return schedule;
	}

	const intervalSeconds =
		task.target.scope === 'instance'
			? wholeMilliseconds(schedule.intervalSeconds)
			: wholeSeconds(schedule.intervalSeconds);

	return { ...schedule, intervalSeconds };
}

/** Rounds to the whole second the scheduler requires, never below one. */
function wholeSeconds(seconds: number): number {
	return Math.max(1, Math.round(seconds));
}

/** Rounds to the whole millisecond a timer honors, never below one. */
function wholeMilliseconds(seconds: number): number {
	return (
		Math.max(1, Math.round(seconds * Time.seconds.toMilliseconds)) / Time.seconds.toMilliseconds
	);
}

function assertInRange(
	taskName: string,
	field: string,
	value: number,
	min: number,
	max = MAX_INTEGER_32BITS_SIGNED,
) {
	if (!Number.isInteger(value) || value < min || value > max) {
		throw new UnexpectedError('A system task declares an out-of-range option', {
			extra: { name: taskName, field, value, min, max },
		});
	}
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
