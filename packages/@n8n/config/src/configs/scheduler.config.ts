import { Time } from '@n8n/constants';
import { z } from 'zod';

import { Config, Env } from '../decorators';
import { positiveIntSchema } from '../schemas';

/** Allows 0 (clamp disabled) in addition to any positive interval, in seconds. */
const nonNegativeIntSchema = z.number({ coerce: true }).int().nonnegative();

/**
 * Configuration for the durable scheduler: a master on/off flag plus the engine
 * tunables (loop cadences, lease and retention windows). All durations are in
 * seconds, matching the `@n8n/scheduler` schedule math (`intervalSeconds`).
 *
 * Default off: with `enabled` false nothing reads these values, so the existing
 * in-memory schedule trigger engine is unaffected. The engine loops that consume
 * this config are wired up separately (lifecycle wiring, materialiser).
 */
@Config
export class SchedulerConfig {
	/** Master flag for the durable scheduler. Off by default; opt in to enable. */
	@Env('N8N_SCHEDULER_ENABLED')
	enabled: boolean = false;

	/** How far ahead (seconds) the materialiser turns schedules into concrete tasks. */
	@Env('N8N_SCHEDULER_MATERIALIZATION_WINDOW', positiveIntSchema)
	materializationWindow: number = Time.minutes.toSeconds;

	/** Interval (seconds) between sweeps that materialise due schedules into tasks. */
	@Env('N8N_SCHEDULER_SWEEP_INTERVAL', positiveIntSchema)
	sweepInterval: number = 10;

	/** Interval (seconds) between executor passes that claim and run due tasks. */
	@Env('N8N_SCHEDULER_EXECUTOR_INTERVAL', positiveIntSchema)
	executorInterval: number = 5;

	/** Interval (seconds) between reaper passes that reclaim expired task leases. */
	@Env('N8N_SCHEDULER_REAPER_INTERVAL', positiveIntSchema)
	reaperInterval: number = 30;

	/** How long (seconds) a claimed task is leased before the reaper may reclaim it. */
	@Env('N8N_SCHEDULER_LEASE_DURATION', positiveIntSchema)
	leaseDuration: number = Time.minutes.toSeconds;

	/** How long (seconds) terminal tasks are retained before being purged. */
	@Env('N8N_SCHEDULER_RETENTION', positiveIntSchema)
	retention: number = 7 * Time.days.toSeconds;

	/** Minimum allowed interval (seconds) between schedule fires. 0 disables the clamp. */
	@Env('N8N_SCHEDULER_MIN_INTERVAL', nonNegativeIntSchema)
	minInterval: number = 0;
}
