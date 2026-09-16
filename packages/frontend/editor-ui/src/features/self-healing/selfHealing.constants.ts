import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';

/** Reviews and activity the assistant authors carry this actor. */
export const SELF_HEALING_ASSISTANT: WorkflowReviewEligibleReviewer = {
	id: 'self-healing-assistant',
	email: 'assistant@n8n.local',
	firstName: 'AI',
	lastName: 'Assistant',
};

/** Prefix of every review id the mock store owns, so the inbox can route lookups to it. */
export const SELF_HEALING_REVIEW_ID_PREFIX = 'self-healing-review-';

/** How long the faked "analysing and fixing" step takes before a review appears. */
export const SELF_HEALING_FIX_DURATION_MS = 2600;

/** Anchor of the self-healing section on the project settings page. */
export const SELF_HEALING_SETTINGS_HASH = '#self-healing';

/** Plain boolean on purpose: a type predicate would narrow the `v-else` branch to `never`. */
export function isSelfHealingAssistant(user: { id?: string | null } | null | undefined): boolean {
	return user?.id === SELF_HEALING_ASSISTANT.id;
}

export function isSelfHealingReviewId(id: string): boolean {
	return id.startsWith(SELF_HEALING_REVIEW_ID_PREFIX);
}
