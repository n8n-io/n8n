import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Shape of the 409 body returned when a write is blocked by an open workflow review, or (message
 * only) by a webhook path conflict. Shared across every write route that can hit this conflict:
 * `PUT /workflows/{id}` today, and `POST /workflows/{id}/publish` /
 * `POST /workflows/{id}/activate` once they migrate off the legacy handler.
 */
export const workflowPublishBlockedErrorPublicSchema = z.object({
	message: z.string(),
	reason: z.enum(['review_pending', 'changes_requested']).optional(),
	workflowReviewRequestId: z.string().optional(),
});

export class WorkflowPublishBlockedErrorPublicDto extends Z.class(
	workflowPublishBlockedErrorPublicSchema.shape,
) {}
