/**
 * Why a publication did no trigger work and was completed without advancing any
 * triggers. The outcome is still a success (the record is marked completed); the
 * reason only informs logging.
 */
export type PublicationSkipReason =
	/** The workflow row no longer exists. */
	| 'workflow-not-found'
	/** The workflow is no longer active, so there are no triggers to reconcile. */
	| 'workflow-inactive';

/** A trigger that activated successfully; carries no error. */
type ActivatedTriggerPublicationStatus = {
	nodeId: string;
	nodeName: string;
	status: 'activated';
};

/** A trigger that failed to activate; always carries the failure message. */
export type FailedTriggerPublicationStatus = {
	nodeId: string;
	nodeName: string;
	status: 'failed';
	errorMessage: string;
};

/** The activation status of a single trigger node after a publication attempt. */
export type TriggerPublicationStatus =
	| ActivatedTriggerPublicationStatus
	| FailedTriggerPublicationStatus;

/**
 * The outcome of applying a single publication outbox record, as produced by
 * {@link WorkflowPublicationApplier} and consumed by
 * {@link PublicationStatusReporter}. The applier never writes outbox statuses or
 * touches activation errors itself; it returns one of these so the reporter is
 * the single place mapping outcomes to terminal statuses and side effects.
 */
export type PublicationResult =
	/** Triggers reconciled (or no change needed); the published version advanced. */
	| { type: 'completed'; triggerStatuses: TriggerPublicationStatus[] }
	/**
	 * The workflow was unpublished: the triggers of the previously published
	 * version were torn down and the `workflow_published_version` mapping removed.
	 * The record is completed and a deactivation status is pushed to the UI.
	 */
	| { type: 'unpublished' }
	/** No trigger work was required; the record is completed without changes. */
	| { type: 'skipped'; reason: PublicationSkipReason }
	/** The history row for the published version is gone; the record is failed. */
	| { type: 'version-missing' }
	/**
	 * The published version advanced and some triggers are running, but others
	 * failed to register. The record is marked `partial_success` and the workflow
	 * stays published (no auto-unpublish); per-trigger detail is in `triggerStatuses`.
	 */
	| { type: 'partial'; triggerStatuses: TriggerPublicationStatus[] }
	/** The publication failed; the record is failed and the error is reported. */
	| { type: 'failed'; error: Error; triggerStatuses?: TriggerPublicationStatus[] };
