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
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type WorkflowPublishingPolicy =
	(typeof WorkflowPublishingPolicy)[keyof typeof WorkflowPublishingPolicy];

export type PublishingAction = 'publish' | 'unpublish' | 'noop';

export type WorkflowPublishingOutcomeState =
	| 'published'
	| 'unpublished'
	| 'unchanged'
	| 'blocked'
	| 'failed';

export type WorkflowPublishingBlockedReason = 'stub-credential' | 'missing-node-type';

/** Result of applying a publishing policy to one imported workflow. */
export interface WorkflowPublishingOutcome {
	state: WorkflowPublishingOutcomeState;
	error?: string;
	/** Present when `state` is `blocked`: why the imported version could not be published. */
	blockedReason?: WorkflowPublishingBlockedReason;
	/**
	 * Present when `state` is `unchanged`: why the imported version was not
	 * activated. The live publish state is unchanged — typically because a prior
	 * published version is still active after an update.
	 */
	skippedPublishReason?: WorkflowPublishingBlockedReason;
}

/** Inputs available after content is saved. */
export interface WorkflowPublishingContext {
	status: 'created' | 'updated' | 'skipped';
	/** Absent when the source publishes a version the package does not carry; the target keeps its own. */
	sourcePublished?: boolean;
	currentlyPublished: boolean;
	isArchived: boolean;
}
