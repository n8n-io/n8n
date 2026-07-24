import { z } from 'zod';

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
	data: WorkflowReviewInboxItem[];
	nextCursor: string | null;
	hasMore: boolean;
}

export interface GetWorkflowReviewInboxSummaryResponse {
	open: number;
	closed: number;
}
