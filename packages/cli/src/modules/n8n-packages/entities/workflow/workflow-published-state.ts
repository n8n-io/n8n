import type { SerializedWorkflowLifecycle } from '../../spec/serialized/workflow-lifecycle.schema';

/**
 * `true` when the source published the version in `workflow.json`, `false` when the source
 * published nothing, `undefined` when it published a version this package does not carry.
 * `undefined` never changes what runs on the target: whatever was live there stays live.
 */
export function derivePublishedState(
	lifecycle: SerializedWorkflowLifecycle,
	exportedVersionId: string,
): boolean | undefined {
	if (lifecycle.publishedVersionId === null) return false;
	return lifecycle.publishedVersionId === exportedVersionId ? true : undefined;
}
