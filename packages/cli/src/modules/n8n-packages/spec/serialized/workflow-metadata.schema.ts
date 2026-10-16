import { z } from 'zod';

/**
 * The version ids live beside `workflow.json`, not in it, so that publishing, or an import
 * that mints its own version, does not read as a change to the workflow's content.
 */
export const serializedWorkflowMetadataSchema = z.object({
	versionId: z.string(),
	publishedVersionId: z.string().min(1).nullable(),
});

export type SerializedWorkflowMetadata = z.infer<typeof serializedWorkflowMetadataSchema>;
