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
	 * The published version advanced but some triggers failed to (de)register.
	 * Unused until partial-activation handling is introduced (CAT-3398).
	 */
	| { type: 'partial'; error: Error }
	/** The publication failed; the record is failed and the error is reported. */
	| { type: 'failed'; error: Error };
