// Deliberately not derived from a shared user type: MinimalUser wrongly claims
// non-nullable names, userBaseSchema wrongly claims optional id/email — and this
// type doubles as the boundary of what the endpoint may expose.
export type WorkflowReviewEligibleReviewer = {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
};

export type WorkflowReviewEligibleReviewersList = {
	count: number;
	data: WorkflowReviewEligibleReviewer[];
};
