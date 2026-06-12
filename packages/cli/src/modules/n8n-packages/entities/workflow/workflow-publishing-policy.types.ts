/* eslint-disable @typescript-eslint/naming-convention -- enum-like members for IDE documentation */
export const WorkflowPublishingPolicy = {
	/** Keeps new workflows inactive; republishes updates only when target and package are both published. */
	PreservePublishedState: 'preserve-published-state',
	/** Target publish state follows the package workflow's published flag. */
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

/** Inputs available after content is saved. */
export interface WorkflowPublishingContext {
	status: 'created' | 'updated' | 'skipped';
	sourcePublished: boolean;
	currentlyPublished: boolean;
	isArchived: boolean;
}
