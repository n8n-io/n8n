import type { WorkflowReviewActivityEntry, WorkflowReviewActivityType } from '@n8n/api-types';
import type { Component } from 'vue';

import WorkflowReviewActivityComment from './activity-entries/WorkflowReviewActivityComment.vue';
import WorkflowReviewActivityFallback from './activity-entries/WorkflowReviewActivityFallback.vue';
import WorkflowReviewActivityEventEntry from './activity-entries/WorkflowReviewActivityEventEntry.vue';

// Total over the union so a new type cannot ship without a renderer; the runtime lookup still
// falls back for a stored type outside the union (e.g. after a version downgrade).
type ActivityEntryRegistry = Record<WorkflowReviewActivityType, Record<number, Component>>;

const registry: ActivityEntryRegistry = {
	'comment.created': { 1: WorkflowReviewActivityComment },
	'review.opened': { 1: WorkflowReviewActivityEventEntry },
	'review.changes_requested': { 1: WorkflowReviewActivityEventEntry },
	'review.approved': { 1: WorkflowReviewActivityEventEntry },
	'review.version_updated': { 1: WorkflowReviewActivityEventEntry },
	'review.closed': { 1: WorkflowReviewActivityEventEntry },
	'workflow.archived': { 1: WorkflowReviewActivityEventEntry },
	'workflow.deleted': { 1: WorkflowReviewActivityEventEntry },
	'workflow.moved': { 1: WorkflowReviewActivityEventEntry },
	'workflow.published': { 1: WorkflowReviewActivityEventEntry },
};

export function resolveActivityComponent(entry: WorkflowReviewActivityEntry): Component {
	return registry[entry.type]?.[entry.typeVersion] ?? WorkflowReviewActivityFallback;
}
