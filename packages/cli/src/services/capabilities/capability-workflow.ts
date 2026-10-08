import type { Scope } from '@n8n/permissions';

import { WorkflowAccessError } from '@/modules/mcp/mcp.errors';
import { type FoundWorkflow, getMcpWorkflow } from '@/modules/mcp/tools/workflow-validation.utils';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { CapabilityContext } from './capability';

export type { FoundWorkflow };

/**
 * Finds the workflow that a capability acts on, as the acting user with the given scopes. On the
 * MCP surface the rules of the built-in MCP tools apply: the workflow must be available in MCP
 * and not archived. The n8n Assistant can reach every workflow that the user can reach.
 *
 * @throws WorkflowAccessError when the user cannot reach the workflow on this surface
 */
export async function findCapabilityWorkflow(
	finder: WorkflowFinderService,
	workflowId: string,
	context: CapabilityContext,
	scopes: Scope[],
): Promise<FoundWorkflow> {
	if (context.surface === 'mcp') {
		return await getMcpWorkflow(workflowId, context.user, scopes, finder);
	}
	const workflow = await finder.findWorkflowForUser(workflowId, context.user, scopes);
	if (!workflow) {
		throw new WorkflowAccessError(
			"Workflow not found or you don't have permission to access it.",
			'no_permission',
		);
	}
	return workflow;
}
