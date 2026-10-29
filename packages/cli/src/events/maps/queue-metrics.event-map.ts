import type { ExecutionStatus } from 'n8n-workflow';

export type QueueMetricsEventMap = {
	'job-counts-updated': {
		active: number;
		completed: number;
		failed: number;
		waiting: number;
	};

	/** A main missed every completion event for a queued job and settled it from the DB. */
	'job-completion-missed': {
		/** Execution status found in the DB, or `deleted` when its row was gone. */
		status: ExecutionStatus | 'deleted';
	};
};
