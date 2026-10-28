import type { WORKFLOW_TOOL_NAME_BY_ACTION } from '@n8n/api-types';

import type { InstanceAiContext } from '../../types';

/** Actions of the former multi-action workflows tool, in the order the agent sees the tools. */
export const WORKFLOW_ACTIONS = [
	'list',
	// Directly after `list`: it answers the same discovery question far more cheaply.
	'node-usage',
	'get',
	'get-as-code',
	'delete',
	'unarchive',
	'setup',
	'validate',
	'publish',
	'unpublish',
	'list-versions',
	'restore-version',
	'update-version',
] as const satisfies ReadonlyArray<keyof typeof WORKFLOW_TOOL_NAME_BY_ACTION>;

export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

export type WorkflowToolName = (typeof WORKFLOW_TOOL_NAME_BY_ACTION)[WorkflowAction];

/**
 * Actions the host supports. The host attaches `nodeUsage` and the version
 * methods only when the capability is on, so the agent is never offered a tool
 * it would get an error from.
 */
export function getSupportedWorkflowActions(
	context: Pick<InstanceAiContext, 'workflowService'>,
	allowedActions?: readonly WorkflowAction[],
): WorkflowAction[] {
	const allowed = new Set<WorkflowAction>(allowedActions ?? WORKFLOW_ACTIONS);
	const { workflowService } = context;
	return WORKFLOW_ACTIONS.filter((action) => {
		if (!allowed.has(action)) return false;
		if (action === 'node-usage') return !!workflowService.nodeUsage;
		if (action === 'list-versions' || action === 'restore-version') {
			return !!workflowService.listVersions;
		}
		if (action === 'update-version') return !!workflowService.updateVersion;
		return true;
	});
}
