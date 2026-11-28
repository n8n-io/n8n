import { z } from 'zod';

import type { PromotionReviewItem } from './dto/promotions/promotion-review.dto';
import type { WorkflowReviewInboxItem } from './dto/workflow-reviews/list-workflow-review-inbox.dto';
import type { SelfHealingResultDetail } from './self-healing-results';

export const inboxSourceTypeSchema = z.enum([
	'workflow_review',
	'self_healing_result',
	'promotion_review',
]);
export type InboxSourceType = z.infer<typeof inboxSourceTypeSchema>;

export const inboxStateSchema = z.enum(['open', 'closed']);
export type InboxState = z.infer<typeof inboxStateSchema>;

export const inboxCategorySchema = z.enum(['waiting', 'authored']);
export type InboxCategory = z.infer<typeof inboxCategorySchema>;

export type InboxWorkflowReviewItem = WorkflowReviewInboxItem & {
	type: 'workflow_review';
};

export type InboxSelfHealingItem = Pick<
	SelfHealingResultDetail,
	'projectId' | 'workflowId' | 'summary' | 'outcome' | 'createdAt' | 'updatedAt' | 'completedAt'
> & {
	type: 'self_healing_result';
	id: string;
	state: InboxState;
	workflowName: string;
};

/**
 * Whether the viewer can approve a promotion review. `madeRun`: the viewer is an approver, but
 * made a promotion run in the review.
 */
export type PromotionReviewViewerApproval = 'allowed' | 'madeRun' | 'notAllowed';

/** The `viewer` fields say what the signed-in user can do with the review now. */
export type InboxPromotionReviewItem = PromotionReviewItem & {
	type: 'promotion_review';
	viewerApproval: PromotionReviewViewerApproval;
	viewerCanClose: boolean;
};

export type InboxItem = InboxWorkflowReviewItem | InboxSelfHealingItem | InboxPromotionReviewItem;

export type InboxCounts = { open: number; closed: number };

export type InboxSourceStatus = {
	/** True when at least one source failed. Disabled sources do not make the response partial. */
	partial: boolean;
	/** Sources that failed to load. A retry can recover them. */
	failedSources: InboxSourceType[];
	/** Sources that are unavailable because their feature is disabled or unlicensed. */
	disabledSources: InboxSourceType[];
};

export type ListInboxResponse = InboxSourceStatus & {
	data: InboxItem[];
	hasMore: boolean;
	nextCursor: string | null;
};

export type GetInboxSummaryResponse = InboxSourceStatus & {
	counts: InboxCounts | null;
};

export type InboxSettings = {
	enabled: boolean;
	availableTypes: InboxSourceType[];
	failedTypes: InboxSourceType[];
};
