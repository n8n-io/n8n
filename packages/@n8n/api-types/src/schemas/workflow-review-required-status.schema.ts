import { z } from 'zod';

export const WorkflowReviewRequiredStatusSchema = z.object({
	reviewRequired: z.boolean(),
	canEdit: z.boolean(),
});

export type WorkflowReviewRequiredStatus = z.infer<typeof WorkflowReviewRequiredStatusSchema>;
