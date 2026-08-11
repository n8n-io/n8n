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
