import { z } from 'zod';

import type { WorkflowReviewActivityEntry } from '../../workflow-review-activity';
import { Z } from '../../zod-class';

export class ListWorkflowReviewActivityQueryDto extends Z.class({
	limit: z.coerce.number().int().min(1).max(100).default(25),
	/** Opaque base64url keyset cursor. Pages *backwards*: returns entries older than it. */
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

/** Shared with the composer, so its character counter cannot drift from the validator. */
export const WORKFLOW_REVIEW_COMMENT_MAX_LENGTH = 10_000;

export class CreateWorkflowReviewCommentDto extends Z.class({
	body: z
		.string()
		.trim()
		.min(1)
		.max(WORKFLOW_REVIEW_COMMENT_MAX_LENGTH)
		// C0 controls other than \n, \r and \t make the Postgres driver throw, turning user
		// input into a 500.
		// eslint-disable-next-line no-control-regex
		.refine((v) => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(v), 'Body contains control characters'),
}) {}
