import { z } from 'zod';

import type { WorkflowReviewActivityEntry } from '../../workflow-review-activity';
import { Z } from '../../zod-class';

export class ListWorkflowReviewActivityQueryDto extends Z.class({
	limit: z.coerce.number().int().min(1).max(100).default(25),
	/** Opaque cursor from a previous response's `nextCursor`. Pages *backwards*: older entries. */
	cursor: z.string().min(1).max(256).optional(),
}) {}

export interface ListWorkflowReviewActivityResponse {
	/** Always ascending by id, regardless of paging direction. */
	data: WorkflowReviewActivityEntry[];
	/** Cursor for the next (older) page; null once the start of the feed is reached. */
	nextCursor: string | null;
	/** Whether *older* entries exist. */
	hasMore: boolean;
}

export const WORKFLOW_REVIEW_COMMENT_MAX_LENGTH = 10_000;

export class CreateWorkflowReviewCommentDto extends Z.class({
	body: z
		.string()
		.trim()
		.min(1)
		.max(WORKFLOW_REVIEW_COMMENT_MAX_LENGTH)
		// NUL cannot be stored in a Postgres text column at all, so it would turn user input
		// into a 500. The rest of C0 is non-printing junk with no place in a comment body, and
		// is rejected in the same pass. \n, \r and \t are deliberately allowed through.
		// eslint-disable-next-line no-control-regex
		.refine((v) => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(v), 'Body contains control characters'),
}) {}
