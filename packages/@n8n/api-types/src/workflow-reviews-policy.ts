import { z } from 'zod';

export const workflowReviewsPolicySchema = z.object({
	enabled: z.boolean(),
});

export type WorkflowReviewsPolicy = z.infer<typeof workflowReviewsPolicySchema>;
