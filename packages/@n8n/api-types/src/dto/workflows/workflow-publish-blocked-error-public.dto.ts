import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Shape of the 409 body returned when a write is blocked by an open workflow review, or (message
 * only) by a webhook path conflict. Shared by every write route that can hit this conflict:
 * `POST /workflows/{id}/publish`, `POST /workflows/{id}/activate` and `PUT /workflows/{id}`.
 */
export const workflowPublishBlockedErrorPublicSchema = z.object({
	message: z.string(),
	reason: z.enum(['review_pending', 'changes_requested']).optional(),
	workflowReviewRequestId: z.string().optional(),
});

export class WorkflowPublishBlockedErrorPublicDto extends Z.class(
	workflowPublishBlockedErrorPublicSchema.shape,
) {}
