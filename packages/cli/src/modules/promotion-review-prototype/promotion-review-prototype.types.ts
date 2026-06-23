export type PromotionStatus = 'pending' | 'approved' | 'rejected';

/** Where a promotion's deployable bytes come from — fetched on demand over the wire. */
export type PromotionSource = {
	kind: 'pulled';
	sourceConnectionId: string;
	deployableHash: string;
};

export interface PromotionRecord {
	id: string;
	title: string;
	sourceInstanceName: string;
	sourceBranch: string;
	submittedAt: string;
	submittedBy: string;
	status: PromotionStatus;
	source: PromotionSource;
}

export interface PromotionReviewSummary {
	id: string;
	title: string;
	sourceInstanceName: string;
	sourceBranch: string;
	submittedAt: string;
	submittedBy: string;
	workflowCount: number;
	status: PromotionStatus;
	hasBlockers: boolean;
}
