import type { IWorkflowBase } from 'n8n-workflow';

/**
 * Determines the active status of a workflow from workflow data.
 *
 * This function handles backward compatibility:
 * - Newer workflow data uses `activeVersionId` (string = active, null/undefined = inactive)
 * - Older workflow data (before activeVersionId was introduced) falls back to the `active` boolean field
 *
 * @param workflowData - Workflow data
 * @returns true if the workflow should be considered active, false otherwise
 */
export function getWorkflowActiveStatusFromWorkflowData(workflowData: IWorkflowBase): boolean {
	return !!workflowData.activeVersionId || workflowData.active;
}

/**
 * Determines if an execution mode is manual or chat.
 *
 * Manual and chat executions use draft sub-workflows to enable
 * iterating on sub-workflows without requiring them to be published.
 *
 * Note: Test webhooks use 'manual' execution mode, so they also use draft versions.
 * Production webhooks use 'webhook' execution mode and use published versions.
 */
export function isManualOrChatExecution(executionMode?: string): boolean {
	if (!executionMode) return false;
	return ['manual', 'chat'].includes(executionMode);
}
