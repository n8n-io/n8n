import type { TriggerActivationFailure } from '@/workflows/triggers/workflow-trigger-activator';

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

/**
 * The outcome of applying a single publication outbox record, as produced by
 * {@link WorkflowPublicationApplier} and consumed by
 * {@link PublicationStatusReporter}. The applier never writes outbox statuses or
 * touches activation errors itself; it returns one of these so the reporter is
 * the single place mapping outcomes to terminal statuses and side effects.
 */
export type PublicationResult =
	/** Triggers reconciled (or no change needed); the published version advanced. */
	| { type: 'completed' }
	/** No trigger work was required; the record is completed without changes. */
	| { type: 'skipped'; reason: PublicationSkipReason }
	/** The history row for the published version is gone; the record is failed. */
	| { type: 'version-missing' }
	/**
	 * The published version advanced and some triggers are running, but others
	 * failed to register. The record is marked `partial_success` and the workflow
	 * stays published (no auto-unpublish); the failures carry per-node detail.
	 */
	| { type: 'partial'; activatedNodeIds: Array<string>; failures: TriggerActivationFailure[] }
	/** The publication failed; the record is failed and the error is reported. */
	| { type: 'failed'; error: Error };
