export type WorkflowPublishingPolicy =
	| 'preserve-published-state'
	| 'match-source'
	| 'all-published'
	| 'all-unpublished';

export type PublishingAction = 'publish' | 'unpublish' | 'noop';

/** Inputs available after content is saved; `priorWasPublished` comes from the plan item. */
export interface WorkflowPublishingContext {
	status: 'created' | 'updated' | 'skipped';
	sourcePublished: boolean;
	priorWasPublished: boolean;
	currentlyPublished: boolean;
	isArchived: boolean;
}
