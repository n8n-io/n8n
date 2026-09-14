import type { User, WorkflowHistory } from '@n8n/db';

import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

/**
 * Retrieves a single workflow history version for MCP operations, translating a
 * missing version into a clear, client-friendly message. Callers should run
 * `getMcpWorkflow` first to enforce the MCP access gate.
 *
 * @throws Error if the version does not exist (e.g. pruned by retention)
 */
export async function getMcpWorkflowVersion(
	workflowHistoryService: WorkflowHistoryService,
	user: User,
	workflowId: string,
	versionId: string,
): Promise<WorkflowHistory> {
	try {
		return await workflowHistoryService.getVersion(user, workflowId, versionId, {
			includePublishHistory: false,
		});
	} catch (error) {
		if (error instanceof WorkflowHistoryVersionNotFoundError) {
			throw new Error(
				`Version '${versionId}' was not found for this workflow. It may have been pruned by workflow history retention.`,
			);
		}
		throw error;
	}
}
