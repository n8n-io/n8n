/**
 * Low-cardinality metrics events emitted by the workflow publication service and
 * consumed by the Prometheus collector. Payloads carry only the metric labels and
 * values, so the collector stays a dumb recorder and the publication/trigger code
 * stays decoupled from `prom-client`.
 */

/** The terminal outcome of processing a single outbox record, as a metric label. */
export type PublicationOutcomeResult =
	| 'published'
	| 'unpublished'
	| 'skipped'
	| 'partial_success'
	| 'failed';

/** Why a record was skipped (or `none` for any non-skipped outcome). */
export type PublicationOutcomeReason =
	| 'none'
	| 'workflow_not_found'
	| 'workflow_inactive'
	| 'version_missing';

/** Whether an operation succeeded or failed. */
export type PublicationOperationResult = 'success' | 'failure';

export type WorkflowPublicationMetricsEventMap = {
	'workflow-publication-outbox-record-processed': {
		result: PublicationOutcomeResult;
		reason: PublicationOutcomeReason;
		durationMs: number;
	};

	'workflow-publication-outbox-cleanup': {
		result: PublicationOperationResult;
		deletedCount: number;
		durationMs: number;
	};
};
