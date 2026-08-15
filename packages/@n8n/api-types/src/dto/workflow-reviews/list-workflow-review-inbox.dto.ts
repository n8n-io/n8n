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
 * Which group of reviews to return: `waiting` = the caller is an assigned
 * reviewer, or is not an author; `authored` = the caller authored it and is not
 * assigned to review it. Being a reviewer wins, so a review sits where the
 * caller's pending action is.
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
	 * Which group of reviews to return — see {@link WorkflowReviewInboxCategory}.
	 * Requesting a review and contributing a version both count as authoring it.
	 * Every visible review falls in exactly one group, so the two add up to the
	 * unfiltered list.
	 *
	 * Independent of `state`: it filters closed reviews the same way. The editor
	 * sends it only for the open tab, which is why the closed list stays flat.
	 *
	 * Omitted means no filter. Narrows visibility, never widens it.
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
