import { z } from 'zod';

/**
 * Kept beside `workflow.json` so that publishing does not read as a change to
 * the workflow's content.
 */
export const serializedWorkflowMetadataSchema = z.object({
	publishedVersionId: z.string().min(1).nullable(),
});

export type SerializedWorkflowMetadata = z.infer<typeof serializedWorkflowMetadataSchema>;
