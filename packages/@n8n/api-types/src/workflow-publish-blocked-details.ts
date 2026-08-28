import { z } from 'zod';

const REVIEW_REASONS = ['review_pending', 'changes_requested'] as const;
const PERMISSION_REASONS = ['insufficient_api_key_scope', 'insufficient_permissions'] as const;

/** Exposed separately because the refined schema below is a `ZodEffects` and has no `shape`. */
export const workflowPublishBlockedDetailsShape = {
	reason: z.enum([...REVIEW_REASONS, ...PERMISSION_REASONS]),
	workflowReviewRequestId: z.string().min(1).optional(),
	/** The version that was saved as a draft but not published, when the caller wrote one. */
	versionId: z.string().min(1).optional(),
};

export const workflowPublishBlockedDetailsSchema = z
	.object(workflowPublishBlockedDetailsShape)
	.strict()
	// A review is identified by the request it belongs to, so that reason is only meaningful with
	// one. The permission reasons need nothing beyond themselves.
	.refine(
		(details) =>
			!(REVIEW_REASONS as readonly string[]).includes(details.reason) ||
			details.workflowReviewRequestId !== undefined,
		{
			message: 'workflowReviewRequestId is required when a review blocks publication',
			path: ['workflowReviewRequestId'],
		},
	);

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

export function isWorkflowPublishBlockedDetails(
	value: unknown,
): value is WorkflowPublishBlockedDetails {
	return workflowPublishBlockedDetailsSchema.safeParse(value).success;
}
