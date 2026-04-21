import type { User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowAccessError } from '../mcp.errors';
import { MCP_GET_SDK_REFERENCE_TOOL } from './workflow-builder/constants';

/**
 * Returns a hint nudging MCP clients to consult the SDK reference,
 * but only when the error is a workflow code parse error.
 */
export function getSdkReferenceHint(error: unknown): string | undefined {
	const isParseError =
		error instanceof Error &&
		(error.name === 'WorkflowCodeParseError' || error instanceof SyntaxError);
	if (!isParseError) return undefined;

	return `Make sure your code uses the n8n Workflow SDK syntax. Call ${MCP_GET_SDK_REFERENCE_TOOL.toolName} first to learn the correct patterns before writing workflow code.`;
}

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
