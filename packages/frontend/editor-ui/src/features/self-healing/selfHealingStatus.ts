import type { WorkflowReviewRequestState } from '@n8n/api-types';
import type { useI18n } from '@n8n/i18n';

import type { WorkflowReviewStatusDisplay } from '@/features/workflow-reviews/workflowReviewStatus.utils';

import type { SelfHealingInboxKind } from './selfHealing.types';

/**
 * Status for the two inbox kinds that are not reviews. "Waiting for review"
 * would be wrong there: nobody reviews anything, the user has to act. `null`
 * for fix reviews and anything else, which keep the regular review status.
 */
export function getSelfHealingStatusDisplay(
	i18n: ReturnType<typeof useI18n>,
	kind: SelfHealingInboxKind | null,
	state: WorkflowReviewRequestState,
): WorkflowReviewStatusDisplay | null {
	if (kind !== 'needs_you' && kind !== 'could_not_fix') return null;

	return {
		stateLabel: i18n.baseText(`workflowReviews.status.${state}`),
		decisionLabel: i18n.baseText(`selfHealing.inbox.status.${kind}`),
		// Yellow, not the blue of "waiting for review": it waits on the user.
		colorClass: state === 'open' ? 'changesRequested' : 'closed',
	};
}
