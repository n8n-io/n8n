/* eslint-disable @typescript-eslint/naming-convention -- enum-like members for IDE documentation */
export const WorkflowPublishingPolicy = {
	/**
	 * Keeps new workflows inactive; republishes an update only when the target is published and
	 * the package carries the version the source publishes.
	 */
	PreservePublishedState: 'preserve-published-state',
	/**
	 * Publishes the version the package carries when the source publishes it, and unpublishes when
	 * the source publishes nothing. Leaves the target's published version alone when the source
	 * publishes a version the package does not carry.
	 */
	MatchSource: 'match-source',
	/** Publishes every imported workflow. */
	PublishAll: 'publish-all',
	/** Leaves new workflows inactive; unpublishes updated workflows that were published. */
	UnpublishAll: 'unpublish-all',
	/**
	 * Never publishes or unpublishes an imported workflow or Agent, whatever the source published.
	 * New entities stay inactive. Updated entities keep the target's published state.
	 * Exception: an archived workflow that is published in the target is still unpublished.
	 * Only promotions use it, so the public API and CLI do not offer it.
	 */
	PreserveTargetState: 'preserve-target-state',
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type WorkflowPublishingPolicy =
	(typeof WorkflowPublishingPolicy)[keyof typeof WorkflowPublishingPolicy];

export type {
	PublishingAction,
	PublishingOutcomeState as WorkflowPublishingOutcomeState,
	PublishingBlockedReason as WorkflowPublishingBlockedReason,
	PublishingOutcome as WorkflowPublishingOutcome,
} from '../publishing';

/** Inputs available after content is saved. */
export interface WorkflowPublishingContext {
	status: 'created' | 'updated' | 'skipped';
	/** Absent when the source publishes a version the package does not carry; the target keeps its own. */
	sourcePublished?: boolean;
	currentlyPublished: boolean;
	isArchived: boolean;
}
