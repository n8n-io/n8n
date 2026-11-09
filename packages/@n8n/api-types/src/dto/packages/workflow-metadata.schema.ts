import { z } from 'zod';

/**
 * The version ids are in a separate file next to `workflow.json`. Then publishing a workflow,
 * or an import that creates a new version, does not show as a change to the workflow.
 * Promotion writes these ids but ignores them on apply: publish state is not promoted.
 */
export const serializedWorkflowMetadataSchema = z.object({
	versionId: z.string(),
	publishedVersionId: z.string().min(1).nullable(),
});

export type SerializedWorkflowMetadata = z.infer<typeof serializedWorkflowMetadataSchema>;
