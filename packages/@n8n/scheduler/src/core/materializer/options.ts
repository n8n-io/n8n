import { Time } from '@n8n/constants';

/**
 * Knobs of a materialization pass.
 * The trade-offs are documented on `materialize`.
 */
export interface MaterializerOptions {
	/**
	 * How far past `now` to record occurrences ahead of time, in seconds.
	 * Must be >= 0.
	 */
	windowSeconds: number;

	/**
	 * How far before a job's `nextRunAt` the claim query already picks it up, in
	 * seconds. Without it, `claimDue` only claims once `nextRunAt <= now`, so a
	 * job already due waits for the next materializer poll tick to be noticed:
	 * up to one poll interval of dispatch lag on top of the job's own schedule.
	 * The host derives it, not a caller-chosen constant: the materializer poll's
	 * own worst-case tick gap plus the executor's lookahead, so a job's
	 * occurrences are recorded early enough for the executor to fire them on time.
	 */
	lookaheadSeconds: number;

	/**
	 * The most occurrences to record for one job in one pass
	 * (drains a backlog in batches).
	 */
	maxPerJob: number;

	/**
	 * The most jobs to claim in one pass,
	 * bounding a single pass's transaction.
	 */
	batchSize: number;

	/**
	 * How long to defer a job whose schedule cannot be planned before retrying, in seconds.
	 */
	planRetrySeconds: number;

	/**
	 * The IANA zone a cron job's `null` timezone resolves to. Callers should pass
	 * the instance-default timezone; the default is only a safe fallback.
	 */
	defaultTimezone: string;
}

export const DEFAULT_MATERIALIZER_OPTIONS: MaterializerOptions = {
	windowSeconds: 60,
	lookaheadSeconds: 0,
	batchSize: 100,
	maxPerJob: 1000,
	planRetrySeconds: Time.hours.toSeconds,
	defaultTimezone: 'UTC',
};
