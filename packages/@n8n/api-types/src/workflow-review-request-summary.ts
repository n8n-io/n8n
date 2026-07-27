import { z } from 'zod';

import type { Iso8601DateTimeString } from './datetime';

export const workflowReviewRequestStateSchema = z.enum(['open', 'closed']);
export type WorkflowReviewRequestState = z.infer<typeof workflowReviewRequestStateSchema>;

export const workflowReviewRequestDecisionSchema = z.enum([
	'pending',
	'changes_requested',
	'approved',
]);
export type WorkflowReviewRequestDecision = z.infer<typeof workflowReviewRequestDecisionSchema>;

export type WorkflowReviewRequestSummary = {
	id: string;
	state: WorkflowReviewRequestState;
	decision: WorkflowReviewRequestDecision;
	/** Pinned version of the workflow; null when the history entry was pruned. (LIGO-879) */
	workflowVersionId: string | null;
	createdAt: Iso8601DateTimeString;
	updatedAt: Iso8601DateTimeString;
};

export type WorkflowReviewRequestList = {
	count: number;
	data: WorkflowReviewRequestSummary[];
};
