// Not MinimalUser: its name fields are non-nullable, while the DB columns are nullable.
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
