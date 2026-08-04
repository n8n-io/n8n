import { Time } from '@n8n/constants';

import type { ConcurrencyMode } from './loop';

/**
 * Cadences, budgets and overlap policy of the periodic loops
 * that drive a running scheduler, one loop per pass.
 */
export interface LifecycleOptions {
	/** How often the materializer sweep records upcoming occurrences, in seconds. */
	materializerIntervalSeconds: number;

	/** How often the executor claims due tasks, in seconds. */
	executorIntervalSeconds: number;

	/** How often the reaper recovers expired leases, in seconds. */
	reaperIntervalSeconds: number;

	/** How often retention deletes finished tasks past their windows, in seconds. */
	retentionIntervalSeconds: number;

	/** How long one materializer sweep may run before it is abandoned, in seconds. */
	materializerTimeoutSeconds: number;

	/** How long one executor claim pass may run before it is abandoned, in seconds. */
	executorTimeoutSeconds: number;

	/** How long one reaper sweep may run before it is abandoned, in seconds. */
	reaperTimeoutSeconds: number;

	/** How long one retention pass may run before it is abandoned, in seconds. */
	retentionTimeoutSeconds: number;

	/**
	 * How far each tick's delay may deviate from its interval, as a ratio of the
	 * interval (0.1 = ±10%). Combined with a random first-tick phase, it keeps
	 * instances started together from hitting storage in lockstep forever.
	 */
	jitterRatio: number;

	/**
	 * What happens when a tick would overlap in-flight passes of the same loop:
	 * - `sequential` drops it (storage that serialises writers, e.g. SQLite),
	 * - `concurrent` lets passes overlap up to {@link maxConcurrentPasses}
	 * (storage that claims with row locks, e.g. Postgres).
	 */
	concurrencyMode: ConcurrencyMode;

	/**
	 * In `concurrent` mode, how many passes of one loop may be in flight at
	 * once. A tick beyond the ceiling is dropped.
	 * Ignored in `sequential` mode.
	 */
	maxConcurrentPasses: number;
}

export const DEFAULT_LIFECYCLE_OPTIONS: LifecycleOptions = {
	materializerIntervalSeconds: 10,
	executorIntervalSeconds: 5,
	reaperIntervalSeconds: 30,
	retentionIntervalSeconds: Time.hours.toSeconds,
	materializerTimeoutSeconds: Time.minutes.toSeconds,
	executorTimeoutSeconds: Time.minutes.toSeconds,
	reaperTimeoutSeconds: Time.minutes.toSeconds,
	retentionTimeoutSeconds: 5 * Time.minutes.toSeconds,
	jitterRatio: 0.1,
	concurrencyMode: 'sequential',
	maxConcurrentPasses: 10,
};
