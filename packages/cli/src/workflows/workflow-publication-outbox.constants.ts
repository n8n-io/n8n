export const WORKFLOW_UNPUBLISH_SENTINEL = '__workflow_unpublish__';

export function isWorkflowUnpublishSentinel(versionId: string): boolean {
	return versionId === WORKFLOW_UNPUBLISH_SENTINEL;
}
