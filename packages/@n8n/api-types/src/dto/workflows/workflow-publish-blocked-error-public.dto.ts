import { z } from 'zod';

import { Z } from '../../zod-class';

export const workflowPublishBlockedErrorPublicSchema = z.object({
	message: z.string(),
	reason: z.enum(['review_pending', 'changes_requested', 'review_required']).optional(),
	workflowReviewRequestId: z.string().optional(),
	versionId: z.string().optional(),
});

export class WorkflowPublishBlockedErrorPublicDto extends Z.class(
	workflowPublishBlockedErrorPublicSchema.shape,
) {}
