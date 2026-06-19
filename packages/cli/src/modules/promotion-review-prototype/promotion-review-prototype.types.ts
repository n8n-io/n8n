export type PromotionStatus = 'pending' | 'approved' | 'rejected';

export interface PromotionRecord {
	id: string;
	title: string;
	sourceInstanceName: string;
	sourceBranch: string;
	submittedAt: string;
	submittedBy: string;
	status: PromotionStatus;
	packageBuffer: Buffer;
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
