import { isObjectLiteral } from '@n8n/backend-common';
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

/** Removes the editor session that a waiting manual run stores, so no read returns it. */
export function hidePushSession(execution: object): void {
	if ('data' in execution && isObjectLiteral(execution.data)) {
		delete execution.data.pushRef;
		delete execution.data.pushRefUserId;
	}
}
