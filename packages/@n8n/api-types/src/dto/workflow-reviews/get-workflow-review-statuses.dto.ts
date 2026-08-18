import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import type { WorkflowReviewRequestSummary } from '../../workflow-review-request-summary';
import { Z } from '../../zod-class';

/** Bounded to one workflow-list page; the service deduplicates. */
export class GetWorkflowReviewStatusesDto extends Z.class({
	workflowIds: z.array(n8nIdSchema).min(1).max(100),
}) {}

/**
 * Status of one workflow's open review. Every reader of the workflow gets the
 * summary; `viewerCanOpen` mirrors the review-detail access rule so the client
 * only links when opening cannot 404.
 */
export type WorkflowReviewStatus = {
	summary: WorkflowReviewRequestSummary;
	viewerCanOpen: boolean;
};

/**
 * Keyed by every requested workflow ID. `null` uniformly covers "no open
 * review", "pruned pin", "unreadable" and "nonexistent", so the response never
 * reveals whether an arbitrary workflow exists.
 */
export type WorkflowReviewStatusesResponse = {
	data: Record<string, WorkflowReviewStatus | null>;
};
