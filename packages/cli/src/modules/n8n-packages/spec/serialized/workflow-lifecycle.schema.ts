import { z } from 'zod';

/**
 * Kept beside `workflow.json` so that publishing or archiving does not read as
 * a change to the workflow's content.
 */
export const serializedWorkflowLifecycleSchema = z.object({
	publishedVersionId: z.string().min(1).nullable(),
	isArchived: z.boolean(),
});

export type SerializedWorkflowLifecycle = z.infer<typeof serializedWorkflowLifecycleSchema>;
