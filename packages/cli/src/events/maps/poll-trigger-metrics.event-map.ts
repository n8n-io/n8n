/**
 * Low-cardinality metrics events emitted by the poll-cursor persistence path and
 * consumed by the Prometheus poll-trigger collector. Payloads carry only the
 * metric labels and values, so the collector stays a dumb recorder and the
 * cursor code stays decoupled from `prom-client`.
 */

/** Which cursor write was attempted. */
export type PollCursorCommitOperation = 'with_execution' | 'cursor_only';

/**
 * How the write ended: committed, rejected by the lease fence (the poll lost
 * the race against a reclaimed lease), or failed outright.
 */
export type PollCursorCommitResult = 'success' | 'fence_rejected' | 'failure';

export type PollTriggerMetricsEventMap = {
	'poll-cursor-commit-settled': {
		operation: PollCursorCommitOperation;
		result: PollCursorCommitResult;
		durationMs: number;
	};
};
