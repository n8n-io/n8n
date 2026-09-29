/**
 * Why a publication did no trigger work and was completed without advancing any
 * triggers. The outcome is still a success (the record is marked completed); the
 * reason only informs logging.
 */
export type PublicationSkipReason =
	/** The workflow row no longer exists. */
	| 'workflow-not-found'
	/**
	 * The version carried duplicate or missing node ids; a corrected
	 * system-authored version was published instead, and that publish enqueued
	 * the record that applies it.
	 */
	| 'node-ids-healed'
	/**
	 * The version carried duplicate or missing node ids, but a concurrent
	 * publish or unpublish won the race against the corrected version; whatever
	 * won enqueued its own record.
	 */
	| 'superseded';

import type { WorkflowPublicationTriggerKind } from '@n8n/db';

import type { TriggerTeardownFailure } from '@/workflows/triggers/workflow-trigger-activator';

/** A trigger that activated successfully; carries no error. */
type ActivatedTriggerPublicationStatus = {
	nodeId: string;
	nodeName: string;
	status: 'activated';
	triggerKind: WorkflowPublicationTriggerKind;
};

/** A trigger that failed to activate; always carries the failure message. */
export type FailedTriggerPublicationStatus = {
	nodeId: string;
	nodeName: string;
	status: 'failed';
	triggerKind: WorkflowPublicationTriggerKind;
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
	/**
	 * Triggers reconciled (or no change needed); the published version advanced.
	 * `teardownFailures`, when present, lists removed webhook nodes whose
	 * external deregistration was abandoned after retries — local routing has
	 * stopped, but a third-party subscription may remain. The record still
	 * completes; the reporter surfaces the failures.
	 */
	| {
			type: 'completed';
			triggerStatuses: TriggerPublicationStatus[];
			teardownFailures?: TriggerTeardownFailure[];
	  }
	/**
	 * The workflow was unpublished: the triggers of the previously published
	 * version were torn down and the `workflow_published_version` mapping removed.
	 * The record is completed and a deactivation status is pushed to the UI.
	 * `teardownFailures` carries abandoned external webhook deregistrations,
	 * as on `completed`.
	 */
	| { type: 'unpublished'; teardownFailures?: TriggerTeardownFailure[] }
	/** No trigger work was required; the record is completed without changes. */
	| { type: 'skipped'; reason: PublicationSkipReason }
	/** The history row for the published version is gone; the record is failed. */
	| { type: 'version-missing' }
	/**
	 * The published version advanced and some triggers are running, but others
	 * failed to register. The record is marked `partial_success` and the workflow
	 * stays published (no auto-unpublish); per-trigger detail is in `triggerStatuses`.
	 * `teardownFailures` carries abandoned external webhook deregistrations from
	 * the remove phase (which ran before the version advanced), as on `completed`.
	 */
	| {
			type: 'partial';
			triggerStatuses: TriggerPublicationStatus[];
			teardownFailures?: TriggerTeardownFailure[];
	  }
	/**
	 * The publication failed; the record is failed and the error is reported.
	 * `teardownFailures` as on `partial`: the remove phase already ran, so its
	 * abandoned deregistrations must still be surfaced.
	 */
	| {
			type: 'failed';
			error: Error;
			triggerStatuses?: TriggerPublicationStatus[];
			teardownFailures?: TriggerTeardownFailure[];
	  };
