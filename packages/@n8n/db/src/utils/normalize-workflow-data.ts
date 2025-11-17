import type { StoredWorkflowData, NormalizedWorkflowData } from '../entities/types-db';

/**
 * Ensures workflow data from executions always has the `active` flag.
 * Derives it from `activeVersionId` if missing (for post-migration data).
 */
export function normalizeWorkflowData(workflowData: StoredWorkflowData): NormalizedWorkflowData {
	if (workflowData.active !== undefined) {
		return workflowData as NormalizedWorkflowData;
	}

	return {
		...workflowData,
		active: !!workflowData.activeVersionId,
	};
}
