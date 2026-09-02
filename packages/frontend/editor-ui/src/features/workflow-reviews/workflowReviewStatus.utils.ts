import type { WorkflowReviewRequestDecision, WorkflowReviewRequestState } from '@n8n/api-types';
import type { BaseTextKey, useI18n } from '@n8n/i18n';

export type WorkflowReviewStatusDisplay = {
	/** The state half alone, for surfaces that compose the two halves themselves. */
	stateLabel: string;
	/** The decision half alone, for surfaces where the state is implied. */
	decisionLabel: string;
	/** Color class of {@link WorkflowReviewStatusDot}. */
	colorClass: 'pending' | 'changesRequested' | 'approved' | 'closed';
};

/**
 * The one mapping from review state/decision to what users see — card badge,
 * detail status card, and status dot all render from here so their labels and
 * colors cannot drift apart. A closed review that never got a decision reads
 * `No decision`, not `Waiting for review`: nobody is waiting anymore.
 */
export function getWorkflowReviewStatusDisplay(
	i18n: ReturnType<typeof useI18n>,
	state: WorkflowReviewRequestState,
	decision: WorkflowReviewRequestDecision,
): WorkflowReviewStatusDisplay {
	const decisionKey: BaseTextKey =
		state === 'closed' && decision === 'pending'
			? 'workflowReviews.decision.noDecision'
			: (`workflowReviews.decision.${decision}` as BaseTextKey);

	const decisionLabel = i18n.baseText(decisionKey);
	const stateLabel = i18n.baseText(`workflowReviews.status.${state}` as BaseTextKey);

	const colorClass =
		state === 'open'
			? decision === 'changes_requested'
				? 'changesRequested'
				: decision === 'approved'
					? 'approved'
					: 'pending'
			: decision === 'approved'
				? 'approved'
				: 'closed';

	return { stateLabel, decisionLabel, colorClass };
}
