import type { WorkflowReviewActivityEntry, WorkflowReviewActivityType } from '@n8n/api-types';
import type { Component } from 'vue';

import WorkflowReviewActivityComment from './activity-entries/WorkflowReviewActivityComment.vue';
import WorkflowReviewActivityFallback from './activity-entries/WorkflowReviewActivityFallback.vue';
import WorkflowReviewActivitySystemEntry from './activity-entries/WorkflowReviewActivitySystemEntry.vue';

// Stays partial: `workflow.published` has no writer yet, and falling back for it is the
// designed behaviour — a total map would force a component for an entry that cannot appear.
type ActivityEntryRegistry = Partial<Record<WorkflowReviewActivityType, Record<number, Component>>>;

const registry: ActivityEntryRegistry = {
	'comment.created': { 1: WorkflowReviewActivityComment },
	'review.opened': { 1: WorkflowReviewActivitySystemEntry },
	'review.changes_requested': { 1: WorkflowReviewActivitySystemEntry },
	'review.approved': { 1: WorkflowReviewActivitySystemEntry },
	'review.version_updated': { 1: WorkflowReviewActivitySystemEntry },
	'review.closed': { 1: WorkflowReviewActivitySystemEntry },
};

export function resolveActivityComponent(entry: WorkflowReviewActivityEntry): Component {
	return registry[entry.type]?.[entry.typeVersion] ?? WorkflowReviewActivityFallback;
}
