import {
	AGENT_BUILDER_TOOL_NAMES,
	buildDataTablesSessionGrantKey,
	buildExecuteNodeSessionGrantKey,
	buildRunStepSessionGrantKey,
	buildRunWorkflowSessionGrantKey,
	buildUpdateWorkflowSessionGrantKey,
	buildWorkflowActionSessionGrantKey,
	buildCleanupTestExecutionsSessionGrantKey,
	buildWorkspaceSessionGrantKey,
	CHANGE_DATA_TABLES_TOOL_NAME,
	DATA_TABLE_WRITE_TOOL_ACTIONS,
	getDataTableCallAction,
	getExecutionCallAction,
	getWorkspaceCallAction,
	isFormerWorkflowsTool,
	isSessionGrantableDataTableAction,
	resolveBuilderToolName,
	REMOVED_BUILDER_TOOL_NAMES,
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	WORKFLOW_TOOL_NAME_BY_ACTION,
	type DataTableWriteToolAction,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

/** Workflow tool actions whose approval the backend stores as a thread grant. */
const WORKFLOW_GRANT_ACTIONS = new Set([
	'delete',
	'unarchive',
	'publish',
	'unpublish',
	'restore-version',
	'update-version',
]);

/** The grant action of each workflow tool that has one, such as `delete` for `archive_workflow`. */
const WORKFLOW_GRANT_ACTION_BY_TOOL = new Map<string, string>(
	Object.entries(WORKFLOW_TOOL_NAME_BY_ACTION)
		.filter(([action]) => WORKFLOW_GRANT_ACTIONS.has(action))
		.map(([action, tool]) => [tool, action]),
);

/** The grant action of a call: from its tool, or from a stored call of the former workflows tool. */
function workflowGrantAction(toolName: string, action: string): string | undefined {
	if (isFormerWorkflowsTool(toolName)) {
		return WORKFLOW_GRANT_ACTIONS.has(action) ? action : undefined;
	}
	return WORKFLOW_GRANT_ACTION_BY_TOOL.get(toolName);
}

// Session "Always allow" keys. They match the thread grants that the backend
// persists, so a UI key and a stored grant name the same permission. Both
// Assistant runtimes use them.

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

/** The distinct actions of a `change_data_tables` call that the backend grants for the session. */
function grantableBatchActions(args: Record<string, unknown>): DataTableWriteToolAction[] {
	const changes: unknown[] = Array.isArray(args.changes) ? args.changes : [];
	const actions = new Set(changes.map((change) => (isRecord(change) ? change.action : undefined)));
	return DATA_TABLE_WRITE_TOOL_ACTIONS.filter(
		(action) => actions.has(action) && isSessionGrantableDataTableAction(action),
	);
}

/**
 * The session keys that approving a call with "Always allow" grants. A batch of
 * data table changes grants one key for each action, so it returns a list.
 * Returns an empty list when the grant cannot be scoped, such as an edit
 * without a workflow ID: a generic `workflow_builder_build_workflow:` key would
 * auto-approve later foreign edits.
 */
export function buildAlwaysAllowKeys(
	rawToolName: string,
	args: Record<string, unknown>,
	confirmationWorkflowId?: string,
): string[] {
	if (rawToolName === CHANGE_DATA_TABLES_TOOL_NAME) {
		return grantableBatchActions(args).map(buildDataTablesSessionGrantKey);
	}
	const key = buildSingleAlwaysAllowKey(rawToolName, args, confirmationWorkflowId);
	return key === null ? [] : [key];
}

function buildSingleAlwaysAllowKey(
	rawToolName: string,
	args: Record<string, unknown>,
	confirmationWorkflowId?: string,
): string | null {
	const toolName = resolveBuilderToolName(rawToolName);
	// Going live is always the user's decision, so publishing an agent asks every time and
	// never offers a grant that would approve the next card on its own (TRUST-1197).
	if (toolName === AGENT_BUILDER_TOOL_NAMES.PUBLISH_AGENT) return null;
	if (toolName === REMOVED_BUILDER_TOOL_NAMES.SUBMIT_WORKFLOW) {
		const isUpdate = typeof args.workflowId === 'string' && args.workflowId.length > 0;
		return `${REMOVED_BUILDER_TOOL_NAMES.SUBMIT_WORKFLOW}:${isUpdate ? 'update' : 'create'}`;
	}
	const action = typeof args.action === 'string' ? args.action : '';
	if (toolName === 'skills' && action === 'import-from-source') return null;
	const workflowId = resolveAlwaysAllowWorkflowId(args, confirmationWorkflowId);
	// Running a workflow grants "always allow" per workflow, so the grant applies only to the
	// workflow the user approved. Without a workflow ID, refuse to store a key (fail closed).
	const executionAction = getExecutionCallAction(rawToolName, action);
	if (executionAction === 'run') {
		if (!workflowId) return null;
		return buildRunWorkflowSessionGrantKey(workflowId);
	}
	// Running one node grants "always allow" per node, so a debug loop on one
	// node stops prompting while the rest of the workflow still asks. Without
	// a node name the key cannot be scoped — refuse to store one (fail closed).
	if (executionAction === 'run-step') {
		const nodeName = typeof args.nodeName === 'string' ? args.nodeName : '';
		if (!workflowId || !nodeName) return null;
		return buildRunStepSessionGrantKey(workflowId, nodeName);
	}
	// Editing a workflow (workflow_builder_build_workflow save, or an update of the former workflows tool) is also per-workflow,
	// matching the backend `workflows:update:<id>` thread grant. Bound workflow_builder_build_workflow
	// saves often omit args.workflowId — use confirmation.workflowId from the suspend
	// payload instead. Without either ID, refuse to store a key (fail closed).
	if (
		(isFormerWorkflowsTool(toolName) && action === 'update') ||
		toolName === WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW
	) {
		if (!workflowId) return null;
		return buildUpdateWorkflowSessionGrantKey(workflowId);
	}
	// Other gated workflow actions, such as publish, are per-workflow too, matching the
	// backend `workflows:<action>:<id>` thread grant. Archive and unpublish cover every
	// workflow of the thread. Without an ID, fail closed.
	const grantAction = workflowGrantAction(toolName, action);
	if (grantAction) {
		if (!workflowId) return null;
		return buildWorkflowActionSessionGrantKey(grantAction, workflowId);
	}
	// Workspace grants keep the action key, for the split tools and the former tool.
	const workspaceAction = getWorkspaceCallAction(rawToolName, action);
	if (workspaceAction === 'cleanup-test-executions') {
		// Deleting test executions is per-workflow, matching the backend thread grant.
		if (!workflowId) return null;
		return buildCleanupTestExecutionsSessionGrantKey(workflowId);
	}
	if (workspaceAction) {
		return buildWorkspaceSessionGrantKey(workspaceAction);
	}
	// Data table grants keep the action key, for the split tools and the former tool.
	const dataTableAction = getDataTableCallAction(rawToolName, action);
	if (dataTableAction) {
		return buildDataTablesSessionGrantKey(dataTableAction);
	}
	// Executing a node grants "always allow" per node type + resource + operation,
	// mirroring the backend thread grant. Without a type, fail closed.
	if (
		(toolName === WORKFLOW_BUILDER_TOOL_NAMES.NODES && action === 'execute') ||
		toolName === SHARED_BUILDER_TOOL_NAMES.EXECUTE_NODE
	) {
		const nodeType = typeof args.type === 'string' ? args.type : '';
		if (!nodeType) return null;
		const config = isRecord(args.config) ? args.config : undefined;
		const parameters = isRecord(config?.parameters) ? config.parameters : undefined;
		return buildExecuteNodeSessionGrantKey(nodeType, parameters);
	}
	return `${toolName}:${action}`;
}
