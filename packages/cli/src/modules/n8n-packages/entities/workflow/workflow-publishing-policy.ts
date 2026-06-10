import type {
	PublishingAction,
	WorkflowPublishingContext,
	WorkflowPublishingPolicy,
} from './workflow-publishing-policy.types';

/**
 * Decides whether to publish, unpublish, or leave publishing unchanged for one
 * imported workflow. Each policy is a pure function of import context — no writes.
 */
/* eslint-disable @typescript-eslint/naming-convention -- API workflow publishing policy keys */
const WORKFLOW_PUBLISHING_POLICIES: Record<
	WorkflowPublishingPolicy,
	(context: WorkflowPublishingContext) => PublishingAction
> = {
	'preserve-published-state': ({ status, priorWasPublished, sourcePublished }) =>
		status === 'updated' && priorWasPublished && sourcePublished ? 'publish' : 'noop',
	'match-source': ({ status, sourcePublished, priorWasPublished }) => {
		if (sourcePublished && (status === 'created' || status === 'updated')) {
			return 'publish';
		}
		if (status === 'updated' && !sourcePublished && priorWasPublished) {
			return 'unpublish';
		}
		return 'noop';
	},
	'all-published': () => 'publish',
	'all-unpublished': ({ status, priorWasPublished }) =>
		status === 'updated' && priorWasPublished ? 'unpublish' : 'noop',
};
/* eslint-enable @typescript-eslint/naming-convention */

export function decideWorkflowPublishingAction(
	policy: WorkflowPublishingPolicy,
	context: WorkflowPublishingContext,
): PublishingAction {
	if (context.status === 'skipped') {
		return 'noop';
	}

	if (context.isArchived) {
		return context.priorWasPublished || context.currentlyPublished ? 'unpublish' : 'noop';
	}

	return WORKFLOW_PUBLISHING_POLICIES[policy](context);
}
