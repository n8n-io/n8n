/**
 * Invalidation-only signal: carries no review state so clients must refetch
 * the authoritative status instead of mirroring event payloads.
 */
export type WorkflowReviewStateChanged = {
	type: 'workflowReviewStateChanged';
	data: {
		workflowId: string;
	};
};

export type WorkflowReviewPushMessage = WorkflowReviewStateChanged;
