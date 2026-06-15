import {
	WorkflowPublishingPolicy,
	type PublishingAction,
	type WorkflowPublishingContext,
} from './workflow-publishing-policy.types';

/**
 * Decides whether to publish, unpublish, or leave publishing unchanged for one
 * imported workflow. Each policy is a pure function of import context — no writes.
 */
const WORKFLOW_PUBLISHING_POLICIES: Record<
	WorkflowPublishingPolicy,
	(context: WorkflowPublishingContext) => PublishingAction
> = {
	[WorkflowPublishingPolicy.PreservePublishedState]: ({
		status,
		currentlyPublished,
		sourcePublished,
	}) => (status === 'updated' && currentlyPublished && sourcePublished ? 'publish' : 'noop'),
	[WorkflowPublishingPolicy.MatchSource]: ({ status, sourcePublished, currentlyPublished }) => {
		if (sourcePublished && (status === 'created' || status === 'updated')) {
			return 'publish';
		}
		if (status === 'updated' && !sourcePublished && currentlyPublished) {
			return 'unpublish';
		}
		return 'noop';
	},
	[WorkflowPublishingPolicy.PublishAll]: () => 'publish',
	[WorkflowPublishingPolicy.UnpublishAll]: ({ status, currentlyPublished }) =>
		status === 'updated' && currentlyPublished ? 'unpublish' : 'noop',
};

export function decideWorkflowPublishingAction(
	policy: WorkflowPublishingPolicy,
	context: WorkflowPublishingContext,
): PublishingAction {
	if (context.status === 'skipped') {
		return 'noop';
	}

	if (context.isArchived) {
		return context.currentlyPublished ? 'unpublish' : 'noop';
	}

	return WORKFLOW_PUBLISHING_POLICIES[policy](context);
}
