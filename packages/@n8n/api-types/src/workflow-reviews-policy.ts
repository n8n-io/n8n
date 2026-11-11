import { z } from 'zod';

/**
 * Instance workflow-review settings. The requirement flags default to false so a
 * stored `{ enabled }` value from before these flags existed still parses.
 * Callers may omit the flags; treat a missing flag as off.
 */
export const workflowReviewsPolicySchema = z.object({
	enabled: z.boolean(),
	publishingNeedsApproval: z.boolean().default(false),
	/** Turns on promotion reviews. Separate from the approval requirement. */
	promotionReviewsEnabled: z.boolean().default(false),
	promotingNeedsApproval: z.boolean().default(false),
});

/** Shape callers may send. Missing flags stay unchanged on update. */
export type WorkflowReviewsPolicy = {
	enabled: boolean;
	publishingNeedsApproval?: boolean;
	promotionReviewsEnabled?: boolean;
	promotingNeedsApproval?: boolean;
};

/** Policy after defaults are applied. */
export type ResolvedWorkflowReviewsPolicy = z.output<typeof workflowReviewsPolicySchema>;

export const reviewRequirementPatchSchema = z
	.object({
		publishingNeedsApproval: z.boolean().optional(),
		promotingNeedsApproval: z.boolean().optional(),
	})
	.strict();

export type ReviewRequirementPatch = z.infer<typeof reviewRequirementPatchSchema>;

const requirementLockSchema = z.enum(['instance', 'project']);

/** What a project settings page shows. Effective value is on when this project or the instance requires it. */
export const projectReviewPolicyViewSchema = z.object({
	publishingNeedsApproval: z.boolean(),
	promotingNeedsApproval: z.boolean(),
	publishingLockedBy: z.enum(['instance']).nullable(),
	promotingLockedBy: z.enum(['instance']).nullable(),
});

export type ProjectReviewPolicyView = z.infer<typeof projectReviewPolicyViewSchema>;

/** What the workflow editor shows. Effective value is on when any scope requires it. */
export const workflowReviewPolicyViewSchema = z.object({
	publishingNeedsApproval: z.boolean(),
	promotingNeedsApproval: z.boolean(),
	publishingLockedBy: requirementLockSchema.nullable(),
	promotingLockedBy: requirementLockSchema.nullable(),
});

export type WorkflowReviewPolicyView = z.infer<typeof workflowReviewPolicyViewSchema>;
export type ReviewRequirementLock = z.infer<typeof requirementLockSchema>;
