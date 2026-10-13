import type { SerializedWorkflowMetadata } from '../../spec/serialized/workflow-metadata.schema';

/**
 * `true` when the source published the version this package carries, `false` when the source
 * published nothing, `undefined` when it published a version this package does not carry.
 * `undefined` never changes what runs on the target: whatever was live there stays live.
 */
export function derivePublishedState(metadata: SerializedWorkflowMetadata): boolean | undefined {
	if (metadata.publishedVersionId === null) return false;
	return metadata.publishedVersionId === metadata.versionId ? true : undefined;
}
