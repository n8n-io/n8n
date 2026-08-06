import type { WorkflowReviewActivityEntry, WorkflowReviewActivityType } from '@n8n/api-types';
import type { Component } from 'vue';

import WorkflowReviewActivityCommentV1 from './activity-entries/WorkflowReviewActivityCommentV1.vue';
import WorkflowReviewActivityFallback from './activity-entries/WorkflowReviewActivityFallback.vue';

type ActivityEntryRegistry = Partial<Record<WorkflowReviewActivityType, Record<number, Component>>>;

// Partial until LIGO-935 registers the remaining six types.
const registry: ActivityEntryRegistry = {
	'comment.created': { 1: WorkflowReviewActivityCommentV1 },
};

export function resolveActivityComponent(entry: WorkflowReviewActivityEntry): Component {
	return registry[entry.type]?.[entry.typeVersion] ?? WorkflowReviewActivityFallback;
}
