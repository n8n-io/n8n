import type { WorkflowReviewActivityEntry, WorkflowReviewActivityType } from '@n8n/api-types';
import type { Component } from 'vue';

import WorkflowReviewActivityComment from './activity-entries/WorkflowReviewActivityComment.vue';
import WorkflowReviewActivityFallback from './activity-entries/WorkflowReviewActivityFallback.vue';
import WorkflowReviewActivityEventEntry from './activity-entries/WorkflowReviewActivityEventEntry.vue';

// Stays partial: `workflow.published` has no writer yet, and falling back for it is the
// designed behaviour — a total map would force a component for an entry that cannot appear.
type ActivityEntryRegistry = Partial<Record<WorkflowReviewActivityType, Record<number, Component>>>;

const registry: ActivityEntryRegistry = {
	'comment.created': { 1: WorkflowReviewActivityComment },
	'review.opened': { 1: WorkflowReviewActivityEventEntry },
	'review.changes_requested': { 1: WorkflowReviewActivityEventEntry },
	'review.approved': { 1: WorkflowReviewActivityEventEntry },
	'review.version_updated': { 1: WorkflowReviewActivityEventEntry },
	'review.closed': { 1: WorkflowReviewActivityEventEntry },
};

export function resolveActivityComponent(entry: WorkflowReviewActivityEntry): Component {
	return registry[entry.type]?.[entry.typeVersion] ?? WorkflowReviewActivityFallback;
}
