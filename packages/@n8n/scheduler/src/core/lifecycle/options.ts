import { Time } from '@n8n/constants';

/**
 * Cadences of the periodic loops that drive a running scheduler, one per pass.
 * The trade-offs of each cadence are documented on the pass it drives.
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

	/**
	 * How far each tick's delay may deviate from its interval, as a ratio of the
	 * interval (0.1 = ±10%). Combined with a random first-tick phase, it keeps
	 * instances started together from hitting storage in lockstep forever.
	 */
	jitterRatio: number;
}

export const DEFAULT_LIFECYCLE_OPTIONS: LifecycleOptions = {
	materializerIntervalSeconds: 10,
	executorIntervalSeconds: 5,
	reaperIntervalSeconds: 30,
	retentionIntervalSeconds: Time.hours.toSeconds,
	jitterRatio: 0.1,
};
