import type { WorkflowReviewActivityEntry, WorkflowReviewActivityType } from '@n8n/api-types';
import type { Component } from 'vue';

import WorkflowReviewActivityFallback from './activity-entries/WorkflowReviewActivityFallback.vue';

type ActivityEntryRegistry = Partial<Record<WorkflowReviewActivityType, Record<number, Component>>>;

const registry: ActivityEntryRegistry = {};

export function resolveActivityComponent(entry: WorkflowReviewActivityEntry): Component {
	return registry[entry.type]?.[entry.typeVersion] ?? WorkflowReviewActivityFallback;
}
