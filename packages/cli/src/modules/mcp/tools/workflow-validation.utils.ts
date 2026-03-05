import type { User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowAccessError } from '../mcp.errors';

export type FoundWorkflow = NonNullable<
	Awaited<ReturnType<WorkflowFinderService['findWorkflowForUser']>>
>;

export type GetMcpWorkflowOptions = {
	includeActiveVersion?: boolean;
};

/**
 * Validates and retrieves a workflow for MCP operations.
 * Performs permission, archive, and MCP availability checks.
 *
 * @throws WorkflowAccessError with appropriate reason if validation fails
 */
export async function getMcpWorkflow(
	workflowId: string,
	user: User,
	scopes: Scope[],
	workflowFinderService: WorkflowFinderService,
	options?: GetMcpWorkflowOptions,
): Promise<FoundWorkflow> {
	const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, scopes, {
		includeActiveVersion: options?.includeActiveVersion,
	});

	if (!workflow) {
		throw new WorkflowAccessError(
			"Workflow not found or you don't have permission to access it.",
			'no_permission',
		);
	}

	if (workflow.isArchived) {
		throw new WorkflowAccessError(
			`Workflow '${workflowId}' is archived and cannot be accessed.`,
			'workflow_archived',
		);
	}

	if (!workflow.settings?.availableInMCP) {
		throw new WorkflowAccessError(
			'Workflow is not available in MCP. Enable MCP access in workflow settings.',
			'not_available_in_mcp',
		);
	}

	return workflow;
}
