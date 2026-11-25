import { z } from 'zod';

export const workflowReviewsPolicySchema = z.object({
	enabled: z.boolean(),
	/** When true, every new version of a team project workflow needs an approved review to publish. */
	alwaysRequired: z.boolean().optional(),
});

export type WorkflowReviewsPolicy = z.infer<typeof workflowReviewsPolicySchema>;

/** The highest level that requires an approved review before a new workflow version is published. */
export type WorkflowReviewRequirementLevel = 'instance' | 'project';
