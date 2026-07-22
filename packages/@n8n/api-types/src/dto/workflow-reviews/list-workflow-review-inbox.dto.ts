import { z } from 'zod';

import {
	type WorkflowReviewRequestDecision,
	type WorkflowReviewRequestState,
	workflowReviewRequestStateSchema,
} from '../../workflow-review-request-summary';
import { Z } from '../../zod-class';

/**
 * Inbox list item — richer than {@link WorkflowReviewRequestSummary}, which is
 * the workflow-scoped list payload used by the review-required toggle sync.
 */
export interface WorkflowReviewInboxItemDto {
	id: string;
	projectId: string;
	title: string;
	workflowName: string | null;
	decision: WorkflowReviewRequestDecision;
	state: WorkflowReviewRequestState;
	createdAt: string;
	updatedAt: string;
}

/**
 * Inbox query. Defaults to open requests when `state` is omitted.
 * Deferred (LIGO-594): `projectId`, `reviewer`, and `author` filters.
 */
export class ListWorkflowReviewInboxQueryDto extends Z.class({
	limit: z.coerce.number().int().min(1).max(100).default(15),
	// Opaque base64url keyset cursor (ISO createdAt + id), not a bare UUID.
	cursor: z.string().min(1).max(256).optional(),
	state: workflowReviewRequestStateSchema.optional(),
}) {}

export interface ListWorkflowReviewInboxResponse {
	data: WorkflowReviewInboxItemDto[];
	nextCursor: string | null;
	hasMore: boolean;
}

export interface GetWorkflowReviewInboxSummaryResponse {
	hasAny: boolean;
}
