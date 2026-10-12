export type PublishingAction = 'publish' | 'unpublish' | 'noop';

export type PublishingOutcomeState =
	| 'published'
	| 'unpublished'
	| 'unchanged'
	| 'blocked'
	| 'failed';

export type PublishingBlockedReason =
	| 'stub-credential'
	| 'incomplete-credential'
	| 'missing-node-type';

export interface PublishingOutcome {
	state: PublishingOutcomeState;
	error?: string;
	/** The imported definition cannot be published, and no version is live. */
	blockedReason?: PublishingBlockedReason;
	/** The imported definition cannot be published. The previous version stays live. */
	skippedPublishReason?: PublishingBlockedReason;
}

export function blockedPublishingOutcome(
	reason: PublishingBlockedReason,
	currentlyPublished: boolean,
): PublishingOutcome {
	return currentlyPublished
		? { state: 'unchanged', skippedPublishReason: reason }
		: { state: 'blocked', blockedReason: reason };
}
