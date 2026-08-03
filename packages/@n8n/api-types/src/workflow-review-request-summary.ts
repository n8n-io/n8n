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
<<<<<<< HEAD
=======
	/** Pinned version of the workflow; null when the history entry was pruned. (LIGO-879) */
	workflowVersionId: string | null;
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
	createdAt: Iso8601DateTimeString;
	updatedAt: Iso8601DateTimeString;
};

<<<<<<< HEAD
export type WorkflowReviewRequestList = {
	count: number;
	data: WorkflowReviewRequestSummary[];
=======
export type WorkflowReviewAutoPublishOutcome =
	| { status: 'published' }
	| { status: 'failed'; message: string };

/** Superset of the summary so consumers of the decision endpoint keep working. */
export type DecideWorkflowReviewRequestResponse = WorkflowReviewRequestSummary & {
	/** Only present on approval: result of auto-publishing the pinned version. */
	autoPublish?: WorkflowReviewAutoPublishOutcome;
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
};
