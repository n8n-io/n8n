import { z } from 'zod';

const OPEN_REVIEW_REASONS = ['review_pending', 'changes_requested'] as const;
const PERMISSION_REASONS = ['insufficient_api_key_scope', 'insufficient_permissions'] as const;

/** Exposed separately because the refined schema below is a `ZodEffects` and has no `shape`. */
export const workflowPublishBlockedDetailsShape = {
	reason: z.enum([...OPEN_REVIEW_REASONS, 'review_required', ...PERMISSION_REASONS]),
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
			!(OPEN_REVIEW_REASONS as readonly string[]).includes(details.reason) ||
			details.workflowReviewRequestId !== undefined,
		{
			message: 'workflowReviewRequestId is required when a review blocks publication',
			path: ['workflowReviewRequestId'],
		},
	)
	// A required review applies to one version, so that reason names it.
	.refine((details) => details.reason !== 'review_required' || details.versionId !== undefined, {
		message: 'versionId is required when publication needs an approved review',
		path: ['versionId'],
	});

export type WorkflowPublishBlockedDetails = z.infer<typeof workflowPublishBlockedDetailsSchema>;
export type WorkflowPublishBlockedReason = WorkflowPublishBlockedDetails['reason'];

/** An open review blocks the publication, or the instance requires an approved review. */
export type WorkflowReviewBlockedDetails =
	| { reason: (typeof OPEN_REVIEW_REASONS)[number]; workflowReviewRequestId: string }
	| { reason: 'review_required'; versionId: string };

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
