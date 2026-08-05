import type { WorkflowReviewRequestDecision, WorkflowReviewRequestState } from '@n8n/api-types';

export type WorkflowReviewStatusVariant = 'pending' | 'changesRequested' | 'approved' | 'closed';

const STATUS_LABEL_KEYS = {
	pending: 'workflowReviews.status.pending',
	changesRequested: 'workflowReviews.status.changesRequested',
	approved: 'workflowReviews.status.approved',
	closed: 'workflowReviews.status.closed',
} as const;

export function resolveWorkflowReviewStatus(
	state: WorkflowReviewRequestState,
	decision: WorkflowReviewRequestDecision,
): {
	variant: WorkflowReviewStatusVariant;
	labelKey: (typeof STATUS_LABEL_KEYS)[WorkflowReviewStatusVariant];
} {
	const variant: WorkflowReviewStatusVariant =
		state === 'open'
			? decision === 'changes_requested'
				? 'changesRequested'
				: 'pending'
			: decision === 'approved'
				? 'approved'
				: 'closed';

	return { variant, labelKey: STATUS_LABEL_KEYS[variant] };
}
