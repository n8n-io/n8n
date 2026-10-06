import {
	buildDataTablesSessionGrantKey,
	buildExecuteNodeSessionGrantKey,
	buildRunStepSessionGrantKey,
	buildRunWorkflowSessionGrantKey,
	buildUpdateWorkflowSessionGrantKey,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

// Session "Always allow" keys. They match the thread grants the backend
// persists, so a UI key and a stored grant name the same permission.

function resolveAlwaysAllowWorkflowId(
	args: Record<string, unknown>,
	confirmationWorkflowId?: string,
): string {
	if (typeof args.workflowId === 'string' && args.workflowId.length > 0) {
		return args.workflowId;
	}
	if (typeof confirmationWorkflowId === 'string' && confirmationWorkflowId.length > 0) {
		return confirmationWorkflowId;
	}
	return '';
}

/**
 * Returns null when an edit grant cannot be scoped to a workflow ID — storing a
 * generic `build-workflow:` key would auto-approve later foreign edits.
 */
export function buildAlwaysAllowKey(
	toolName: string,
	args: Record<string, unknown>,
	confirmationWorkflowId?: string,
): string | null {
	if (toolName === 'submit-workflow') {
		const isUpdate = typeof args.workflowId === 'string' && args.workflowId.length > 0;
		return `submit-workflow:${isUpdate ? 'update' : 'create'}`;
	}
	const action = typeof args.action === 'string' ? args.action : '';
	const workflowId = resolveAlwaysAllowWorkflowId(args, confirmationWorkflowId);
	// Running a workflow grants "always allow" per workflow, so the grant applies only to the
	// workflow the user approved.
	if (toolName === 'executions' && action === 'run') {
		return buildRunWorkflowSessionGrantKey(workflowId);
	}
	// Running one node grants "always allow" per node, so a debug loop on one
	// node stops prompting while the rest of the workflow still asks. Without
	// a node name the key cannot be scoped — refuse to store one (fail closed).
	if (toolName === 'executions' && action === 'run-step') {
		const nodeName = typeof args.nodeName === 'string' ? args.nodeName : '';
		if (!workflowId || !nodeName) return null;
		return buildRunStepSessionGrantKey(workflowId, nodeName);
	}
	// Editing a workflow (build-workflow save or workflows update) is also per-workflow,
	// matching the backend `workflows:update:<id>` thread grant. Bound build-workflow
	// saves often omit args.workflowId — use confirmation.workflowId from the suspend
	// payload instead. Without either ID, refuse to store a key (fail closed).
	if ((toolName === 'workflows' && action === 'update') || toolName === 'build-workflow') {
		if (!workflowId) return null;
		return buildUpdateWorkflowSessionGrantKey(workflowId);
	}
	if (toolName === 'data-tables') {
		return buildDataTablesSessionGrantKey(action);
	}
	// Executing a node grants "always allow" per node type + resource + operation,
	// mirroring the backend thread grant. Without a type, fail closed.
	if (toolName === 'nodes' && action === 'execute') {
		const nodeType = typeof args.type === 'string' ? args.type : '';
		if (!nodeType) return null;
		const config = isRecord(args.config) ? args.config : undefined;
		const parameters = isRecord(config?.parameters) ? config.parameters : undefined;
		return buildExecuteNodeSessionGrantKey(nodeType, parameters);
	}
	return `${toolName}:${action}`;
}
