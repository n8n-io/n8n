import { z } from 'zod';

export const workflowPublishBlockedDetailsSchema = z
	.object({
		reason: z.enum(['review_pending', 'changes_requested']),
		workflowReviewRequestId: z.string().min(1),
	})
	.strict();

export type WorkflowPublishBlockedDetails = z.infer<typeof workflowPublishBlockedDetailsSchema>;
export type WorkflowPublishBlockedReason = WorkflowPublishBlockedDetails['reason'];

export function isWorkflowPublishBlockedDetails(
	value: unknown,
): value is WorkflowPublishBlockedDetails {
	return workflowPublishBlockedDetailsSchema.safeParse(value).success;
}
