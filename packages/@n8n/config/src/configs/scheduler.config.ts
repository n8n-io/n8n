import { Time } from '@n8n/constants';
import { z } from 'zod';

import { Config, Env } from '../decorators';
import { positiveIntSchema } from '../schemas';

/**
 * Allows 0 (the clamp disabled) in addition to any positive value. Used for a
 * setting where 0 is a meaningful "off", not just a smaller number.
 */
const nonNegativeIntSchema = z.number({ coerce: true }).int().nonnegative();

/**
 * A jitter ratio: a fraction in [0, 1). 0 disables jitter; 1 or above would
 * allow a zero or negative delay between ticks, so they are rejected.
 */
const jitterRatioSchema = z.number({ coerce: true }).nonnegative().lt(1);

/**
 * Configuration for the durable scheduler: the engine that runs time-based
 * workflows (such as Schedule Trigger nodes) from a database-backed queue.
 *
 * Unlike the in-memory scheduler, due runs are recorded in the database before
 * they start, so they survive restarts and, in a multi-instance setup, each run
 * is picked up by exactly one instance instead of every instance firing it.
 *
 * Off by default. While {@link enabled} is false none of these settings have any
 * effect and the existing in-memory Schedule Trigger behaviour is unchanged. The
 * tunables below only matter once the scheduler is turned on; the defaults suit
 * most instances, so change them only to tune timing precision or storage.
 */
@Config
export class SchedulerConfig {
	/**
	 * Turn on the durable scheduler. Off by default so existing self-hosted setups
	 * keep using the in-memory scheduler and behave exactly as before.
	 *
	 * When on, scheduled runs are stored in the database before they execute, so a
	 * restart doesn't drop them and, across multiple instances, each run executes
	 * once rather than once per instance.
	 */
	@Env('N8N_SCHEDULER_ENABLED')
	enabled: boolean = false;

	/**
	 * How far into the future, in seconds, the scheduler works out and records the
	 * runs that are coming up. Defaults to 60 seconds.
	 *
	 * A larger window commits more runs to the database in advance (more resilient
	 * to downtime, slightly more storage churn); a smaller one keeps less ahead.
	 * Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_MATERIALIZATION_WINDOW', positiveIntSchema)
	materializationWindowSeconds: number = Time.minutes.toSeconds;

	/**
	 * How often, in seconds, the scheduler scans active schedules to record their
	 * upcoming runs (those falling within the window above). Defaults to 10 seconds.
	 * Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_SWEEP_INTERVAL', positiveIntSchema)
	sweepIntervalSeconds: number = 10;

	/**
	 * How long, in seconds, a single scan for upcoming runs may take before it is
	 * abandoned and retried on its next interval. Guards against a scan stuck on
	 * a slow or unresponsive database holding its slot forever.
	 * Defaults to 60 seconds.
	 * Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_SWEEP_TIMEOUT', positiveIntSchema)
	sweepTimeoutSeconds: number = Time.minutes.toSeconds;

	/**
	 * How often, in seconds, the scheduler checks for recorded runs whose time has
	 * arrived and starts them. Defaults to 5 seconds.
	 *
	 * This sets the worst-case delay between a run's scheduled time and when it
	 * actually starts. Lower it for tighter timing at the cost of more frequent
	 * polling. Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_EXECUTOR_INTERVAL', positiveIntSchema)
	executorIntervalSeconds: number = 5;

	/**
	 * How long, in seconds, a single check for due runs may take before it is
	 * abandoned and retried on its next interval.
	 * Guards against a check stuck on a slow or unresponsive database holding its slot forever.
	 * Defaults to 60 seconds.
	 * Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_EXECUTOR_TIMEOUT', positiveIntSchema)
	executorTimeoutSeconds: number = Time.minutes.toSeconds;

	/**
	 * The most runs a single claim takes from the queue in one pass. Defaults to 100.
	 * Larger batches drain a backlog faster but hold more work on one instance per
	 * tick. Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_CLAIM_BATCH_SIZE', positiveIntSchema)
	claimBatchSize: number = 100;

	/**
	 * How often, in seconds, the scheduler looks for runs that an instance claimed
	 * but never finished (for example because it crashed or was shut down) and
	 * makes them available again so another instance can pick them up. Defaults to
	 * 30 seconds. Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_REAPER_INTERVAL', positiveIntSchema)
	reaperIntervalSeconds: number = 30;

	/**
	 * The most expired-lease tasks a single reaper sweep reclaims. Defaults to 100.
	 * Larger batches recover a backlog faster but hold more work on one instance per
	 * sweep. Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_REAPER_BATCH_SIZE', positiveIntSchema)
	reaperBatchSize: number = 100;

	/**
	 * How long, in seconds, a single recovery sweep may take
	 * before it is abandoned and retried on its next interval.
	 * Guards against a sweep stuck on a slow or unresponsive database holding its slot forever.
	 * Defaults to 60 seconds.
	 * Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_REAPER_TIMEOUT', positiveIntSchema)
	reaperTimeoutSeconds: number = Time.minutes.toSeconds;

	/**
	 * How long, in seconds, a single instance holds an exclusive claim on a run it
	 * has picked up, so no other instance starts the same one. Defaults to 60 seconds.
	 *
	 * If that instance stops without finishing, the claim expires after this long
	 * and another instance may take the run over. Keep it comfortably above the
	 * time a run needs to get going: too short risks two instances starting the
	 * same run; too long delays recovery after a crash. Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_LEASE_DURATION', positiveIntSchema)
	leaseDurationSeconds: number = Time.minutes.toSeconds;

	/**
	 * How long, in seconds, tasks that finished cleanly
	 * (succeeded or were cancelled) are kept before being deleted.
	 *
	 * These rows exist only as recent history, so a short window keeps the
	 * scheduler's run table small on busy instances.
	 *
	 * Raise it to keep scheduling history longer for auditing.
	 * Lower it to reclaim database space sooner.
	 *
	 * Defaults to 1 day.
	 * Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_RETENTION', positiveIntSchema)
	retentionSeconds: number = Time.days.toSeconds;

	/**
	 * How long, in seconds, tasks that went wrong
	 * (failed, or missed their moment entirely) are kept before being deleted.
	 *
	 * Meant to be kept longer than cleanly finished runs (`N8N_SCHEDULER_RETENTION`)
	 * so there is time to notice and debug a problem before its evidence is deleted.
	 *
	 * The scheduler warns when this is set below it.
	 * Must be greater than 0.
	 * Defaults to 7 days.
	 */
	@Env('N8N_SCHEDULER_FAILED_RETENTION', positiveIntSchema)
	failedRetentionSeconds: number = 7 * Time.days.toSeconds;

	/**
	 * How often, in seconds, the scheduler deletes finished tasks older than the
	 * retention windows above.
	 *
	 * Must be greater than 0.
	 * Defaults to 1 hour.
	 */
	@Env('N8N_SCHEDULER_RETENTION_INTERVAL', positiveIntSchema)
	retentionIntervalSeconds: number = Time.hours.toSeconds;

	/**
	 * How long, in seconds, a single cleanup of old finished tasks may take
	 * before it is abandoned and retried on its next interval.
	 * Defaults to 300 seconds.
	 * Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_RETENTION_TIMEOUT', positiveIntSchema)
	retentionTimeoutSeconds: number = 5 * Time.minutes.toSeconds;

	/**
	 * The most background checks of the same kind (for example several scans for
	 * upcoming runs) allowed to run at the same time on one instance, when the
	 * database supports overlapping checks (Postgres).
	 * When a check is due while this many are still running, it is skipped.
	 * On SQLite checks never overlap and this setting has no effect.
	 * Defaults to 10.
	 * Must be greater than 0.
	 */
	@Env('N8N_SCHEDULER_MAX_CONCURRENT_PASSES', positiveIntSchema)
	maxConcurrentPasses: number = 10;

	/**
	 * Adds a small random variation to the timing of the scheduler's periodic
	 * background checks (the intervals configured above), as a fraction of each
	 * interval. For example, with 0.1 a check configured to run every 10 seconds
	 * actually runs every 9 to 11 seconds. Defaults to 0.1.
	 *
	 * Without this variation, several n8n instances started at the same time
	 * (for example during a rolling deploy) would all query the database at the
	 * same moments; the randomness spreads those queries out.
	 *
	 * Must be at least 0 and below 1. Set it to 0 to make the checks run at
	 * exact intervals, or raise it to spread database load across instances
	 * more evenly.
	 */
	@Env('N8N_SCHEDULER_JITTER_RATIO', jitterRatioSchema)
	jitterRatio: number = 0.1;

	/**
	 * The smallest gap, in seconds, allowed between consecutive runs of the same
	 * schedule. A schedule set to run more often than this is slowed down to this
	 * gap. Defaults to 0, which disables the limit and honours whatever interval
	 * each schedule specifies.
	 *
	 * Set it to put a floor on how frequently any schedule can run, for example to
	 * stop a misconfigured every-second schedule from overloading the instance.
	 */
	@Env('N8N_SCHEDULER_MIN_INTERVAL', nonNegativeIntSchema)
	minIntervalSeconds: number = 0;

	/**
	 * How a Schedule Trigger node's "every N seconds/minutes" schedules run under
	 * the durable scheduler. Defaults to `legacy`.
	 *
	 * - `legacy`: fires stay aligned to the clock (on the minute, on the hour) and
	 *   match the in-memory scheduler exactly.
	 * - `new`: fires are spaced a steady N apart, timed from when the workflow was
	 *   activated rather than from clock boundaries.
	 *
	 * `new` runs "every N" more faithfully. The legacy timing restarts every
	 * minute, so an interval that doesn't divide evenly drifts (every 7 seconds,
	 * for example, leaves a 4-second gap across each minute boundary); `new` keeps
	 * a uniform gap throughout.
	 *
	 * `legacy` is the default so timing is unchanged while the durable scheduler
	 * rolls out; `new` is the intended future default. Only "every N
	 * seconds/minutes" schedules are affected: longer schedules (every N
	 * hours/days/weeks/months) and raw cron expressions run the same way under
	 * either setting.
	 */
	@Env('N8N_SCHEDULER_TRIGGER_NODE_MODE', z.enum(['legacy', 'new']))
	triggerNodeMode: 'legacy' | 'new' = 'legacy';
}
