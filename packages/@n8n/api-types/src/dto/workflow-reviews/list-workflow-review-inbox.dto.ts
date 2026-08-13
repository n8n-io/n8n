import { z } from 'zod';

import type { WorkflowReviewEligibleReviewer } from '../../workflow-review-eligible-reviewer';
import {
	type WorkflowReviewRequestSummary,
	workflowReviewRequestStateSchema,
} from '../../workflow-review-request-summary';
import { Z } from '../../zod-class';

/**
 * Inbox list item — extends {@link WorkflowReviewRequestSummary} with the
 * cross-project fields the inbox needs.
 */
export interface WorkflowReviewInboxItem extends WorkflowReviewRequestSummary {
	projectId: string;
	title: string;
	workflowName: string | null;
	requester: WorkflowReviewEligibleReviewer | null;
	authors: WorkflowReviewEligibleReviewer[];
	reviewers: WorkflowReviewEligibleReviewer[];
}

export const workflowReviewInboxCategorySchema = z.enum(['waiting', 'authored']);

/**
 * Partition of the inbox into its two sections. Reviewer assignment wins when
 * both roles apply, so a review sits where the caller's pending action is.
 */
export type WorkflowReviewInboxCategory = z.infer<typeof workflowReviewInboxCategorySchema>;

/**
 * Inbox query. Defaults to open requests when `state` is omitted.
 */
export class ListWorkflowReviewInboxQueryDto extends Z.class({
	limit: z.coerce.number().int().min(1).max(100).default(15),
	// Opaque base64url keyset cursor (ISO createdAt + id), not a bare UUID.
	cursor: z.string().min(1).max(256).optional(),
	state: workflowReviewRequestStateSchema.optional(),
	/**
	 * Partition of the visible union into the two inbox sections: `waiting` =
	 * the caller is an assigned reviewer, or did not author the review at all;
	 * `authored` = the caller authored it — as requester or by contributing a
	 * version, both of which write a `workflow_review_request_authors` row — and
	 * is not assigned to review it; reviewer assignment wins when both roles
	 * apply. Omitted = no filter. Narrows visibility, never widens it.
	 */
	category: workflowReviewInboxCategorySchema.optional(),
}) {}

export interface ListWorkflowReviewInboxResponse {
	data: WorkflowReviewInboxItem[];
	nextCursor: string | null;
	hasMore: boolean;
}

export interface GetWorkflowReviewInboxSummaryResponse {
	open: number;
	closed: number;
}
