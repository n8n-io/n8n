import type { IWorkflowBase } from 'n8n-workflow';

/**
 * Determines the active status of a workflow from execution data.
 *
 * This function handles backward compatibility:
 * - Newer executions use `activeVersionId` (string = active, null/undefined = inactive)
 * - Older executions (before activeVersionId was introduced) fall back to the `active` boolean field
 *
 * @param workflowData - Workflow data from an execution
 * @returns true if the workflow should be considered active, false otherwise
 */
export function getWorkflowActiveStatusFromExecution(workflowData: IWorkflowBase): boolean {
	return !!workflowData.activeVersionId || workflowData.active;
}
