import { z } from 'zod';

const REVIEW_REASONS = ['review_pending', 'changes_requested'] as const;

export const workflowPublishBlockedDetailsSchema = z
	.object({
		reason: z.enum([...REVIEW_REASONS, 'insufficient_api_key_scope', 'insufficient_permissions']),
		workflowReviewRequestId: z.string().min(1).optional(),
	})
	.strict();

export type WorkflowPublishBlockedDetails = z.infer<typeof workflowPublishBlockedDetailsSchema>;
export type WorkflowPublishBlockedReason = WorkflowPublishBlockedDetails['reason'];

const isReviewReason = (reason: WorkflowPublishBlockedReason) =>
	(REVIEW_REASONS as readonly string[]).includes(reason);

export function isWorkflowPublishBlockedDetails(
	value: unknown,
): value is WorkflowPublishBlockedDetails {
	const parsed = workflowPublishBlockedDetailsSchema.safeParse(value);

	// A review is identified by the request it belongs to, so that reason is only meaningful with one.
	// The permission reasons need nothing beyond themselves.
	return (
		parsed.success &&
		(!isReviewReason(parsed.data.reason) || parsed.data.workflowReviewRequestId !== undefined)
	);
}
