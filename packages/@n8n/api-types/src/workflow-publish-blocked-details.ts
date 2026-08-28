import { z } from 'zod';

const REVIEW_REASONS = ['review_pending', 'changes_requested'] as const;
const PERMISSION_REASONS = ['insufficient_api_key_scope', 'insufficient_permissions'] as const;

export const workflowPublishBlockedDetailsSchema = z
	.object({
		reason: z.enum([...REVIEW_REASONS, ...PERMISSION_REASONS]),
		workflowReviewRequestId: z.string().min(1).optional(),
		/** The version that was saved as a draft but not published, when the caller wrote one. */
		versionId: z.string().min(1).optional(),
	})
	.strict();

export type WorkflowPublishBlockedDetails = z.infer<typeof workflowPublishBlockedDetailsSchema>;
export type WorkflowPublishBlockedReason = WorkflowPublishBlockedDetails['reason'];

/** An open review blocks the publication. The draft stays saved and the review owns the next step. */
export type WorkflowReviewBlockedReason = (typeof REVIEW_REASONS)[number];
export type WorkflowReviewBlockedDetails = {
	reason: WorkflowReviewBlockedReason;
	workflowReviewRequestId: string;
};

/** The caller may write the draft but not release it. Carries the draft it wrote. */
export type WorkflowPublishForbiddenReason = (typeof PERMISSION_REASONS)[number];
export type WorkflowPublishForbiddenDetails = {
	reason: WorkflowPublishForbiddenReason;
	versionId?: string;
};

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
