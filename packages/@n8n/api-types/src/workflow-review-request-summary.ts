import { z } from 'zod';

import type { Iso8601DateTimeString } from './datetime';
import type { MinimalUser } from './user';

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
	createdAt: Iso8601DateTimeString;
	updatedAt: Iso8601DateTimeString;
	reviewer: MinimalUser | null;
	reviewedVersionId: string | null;
};

export type WorkflowReviewRequestList = {
	count: number;
	data: WorkflowReviewRequestSummary[];
};
