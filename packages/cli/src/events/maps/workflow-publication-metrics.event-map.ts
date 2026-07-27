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
export type PublicationOutcomeReason = 'none' | 'workflow_not_found' | 'version_missing';

/** A trigger operation performed during publication. */
export type PublicationTriggerOperation = 'activate' | 'deactivate';

/** Whether an operation (or a set of trigger nodes) succeeded or failed. */
export type PublicationOperationResult = 'success' | 'failure';

export type WorkflowPublicationMetricsEventMap = {
	'workflow-publication-outbox-record-processed': {
		result: PublicationOutcomeResult;
		reason: PublicationOutcomeReason;
		durationMs: number;
	};

	'workflow-publication-trigger-operation': {
		operation: PublicationTriggerOperation;
		result: PublicationOperationResult;
		durationMs: number;
	};

	'workflow-publication-trigger-node-operations': {
		operation: PublicationTriggerOperation;
		result: PublicationOperationResult;
		count: number;
	};

	'workflow-publication-outbox-cleanup': {
		result: PublicationOperationResult;
		deletedCount: number;
		durationMs: number;
	};

	'workflow-publication-reconciliation': {
		result: PublicationOperationResult;
		/** Workflows re-enqueued because their in-memory triggers were missing. */
		deficientCount: number;
		/** Registered workflows torn down because they are no longer published. */
		surplusCount: number;
		/** Workflows re-enqueued because their published version diverged from the active version. */
		versionSkewCount: number;
		durationMs: number;
	};
};
