import type { WorkflowReviewActivityEntry, WorkflowReviewActivityType } from '@n8n/api-types';
import type { Component } from 'vue';

import WorkflowReviewActivityCommentV1 from './activity-entries/WorkflowReviewActivityCommentV1.vue';
import WorkflowReviewActivityFallback from './activity-entries/WorkflowReviewActivityFallback.vue';

type ActivityEntryRegistry = Partial<Record<WorkflowReviewActivityType, Record<number, Component>>>;

/**
 * `satisfies`, not an annotation: an annotation widens the values to `Component`,
 * which would let anything register. Partial because six of the seven types have
 * no component yet — LIGO-935 registers them and makes this a total `Record`.
 */
const registry = {
	'comment.created': { 1: WorkflowReviewActivityCommentV1 },
} satisfies ActivityEntryRegistry;

// `registry`'s literal type spans one key only, so the lookup below needs the wider one.
const lookup: ActivityEntryRegistry = registry;

export function resolveActivityComponent(entry: WorkflowReviewActivityEntry): Component {
	return lookup[entry.type]?.[entry.typeVersion] ?? WorkflowReviewActivityFallback;
}
