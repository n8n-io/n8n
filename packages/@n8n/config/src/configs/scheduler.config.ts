import { Time } from '@n8n/constants';
import { z } from 'zod';

import { Config, Env } from '../decorators';
import { positiveIntSchema } from '../schemas';

/** Allows 0 (clamp disabled) in addition to positive values. */
const nonNegativeIntSchema = z.number({ coerce: true }).int().nonnegative();

/**
 * Configuration for the durable scheduler, which runs scheduled workflow
 * executions from a persisted store so they survive restarts. Off by default;
 * while `enabled` is false nothing reads these values, so the existing schedule
 * trigger behaviour is unchanged.
 */
@Config
export class SchedulerConfig {
	/** Whether the durable scheduler is enabled. Off by default; set to opt in. */
	@Env('N8N_SCHEDULER_ENABLED')
	enabled: boolean = false;

	/** How far ahead, in seconds, upcoming scheduled executions are prepared. */
	@Env('N8N_SCHEDULER_MATERIALIZATION_WINDOW', positiveIntSchema)
	materializationWindow: number = Time.minutes.toSeconds;

	/** How often, in seconds, n8n checks for upcoming scheduled executions to prepare. */
	@Env('N8N_SCHEDULER_SWEEP_INTERVAL', positiveIntSchema)
	sweepInterval: number = 10;

	/** How often, in seconds, n8n checks for due scheduled executions to start. */
	@Env('N8N_SCHEDULER_EXECUTOR_INTERVAL', positiveIntSchema)
	executorInterval: number = 5;

	/** How often, in seconds, n8n recovers scheduled executions left running by a stopped instance. */
	@Env('N8N_SCHEDULER_REAPER_INTERVAL', positiveIntSchema)
	reaperInterval: number = 30;

	/** How long, in seconds, one instance holds a scheduled execution before another may retry it. */
	@Env('N8N_SCHEDULER_LEASE_DURATION', positiveIntSchema)
	leaseDuration: number = Time.minutes.toSeconds;

	/** How long, in seconds, finished scheduled executions are kept before being deleted. */
	@Env('N8N_SCHEDULER_RETENTION', positiveIntSchema)
	retention: number = 7 * Time.days.toSeconds;

	/** Smallest interval, in seconds, allowed between scheduled executions. 0 means no limit. */
	@Env('N8N_SCHEDULER_MIN_INTERVAL', nonNegativeIntSchema)
	minInterval: number = 0;
}
