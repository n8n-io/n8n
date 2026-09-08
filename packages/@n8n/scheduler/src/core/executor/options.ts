import { Time } from '@n8n/constants';

/**
 * Knobs of the executor.
 * The trade-offs are documented on `Executor`.
 */
export interface ExecutorOptions {
	/**
	 * How long a claim's lease lasts, in seconds. An instance that stalls or dies
	 * past this is assumed gone and the reaper may hand its tasks to another.
	 * Must stay above `lookaheadSeconds`, or a claimed task can lose its lease
	 * before it even fires.
	 */
	leaseSeconds: number;

	/**
	 * How far past now a claim looks, in seconds. Set it to the driver's tick
	 * interval: a task due before the next tick is then claimed one tick early
	 * and fires precisely on its `runAt` timer, at the cost of holding its claim
	 * until then.
	 */
	lookaheadSeconds: number;

	/** The most tasks one claim takes from the queue per tick. */
	batchSize: number;
}

export const DEFAULT_EXECUTOR_OPTIONS: ExecutorOptions = {
	leaseSeconds: Time.minutes.toSeconds,
	lookaheadSeconds: 5,
	batchSize: 100,
};
