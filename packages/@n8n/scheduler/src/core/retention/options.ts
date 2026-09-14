import { Time } from '@n8n/constants';

/**
 * Knobs of a retention pass.
 * The trade-offs are documented on `prune`.
 */
export interface RetentionOptions {
	/**
	 * How long tasks that finished cleanly (succeeded, cancelled) are kept after finishing, in seconds.
	 * Must be > 0.
	 */
	retentionSeconds: number;

	/**
	 * How long tasks that went wrong (failed, missed) are kept after finishing, in seconds.
	 * Must be > 0.
	 */
	failedRetentionSeconds: number;

	/**
	 * The most rows one delete statement removes.
	 * Must be a positive integer.
	 */
	batchSize: number;

	/**
	 * The most delete statements one pass issues, shared across both windows,
	 * bounding the pass; a backlog beyond it drains over successive passes.
	 */
	maxBatchesPerPass: number;
}

export const DEFAULT_RETENTION_OPTIONS: RetentionOptions = {
	retentionSeconds: Time.days.toSeconds,
	failedRetentionSeconds: 7 * Time.days.toSeconds,
	batchSize: 1000,
	maxBatchesPerPass: 1000,
};
