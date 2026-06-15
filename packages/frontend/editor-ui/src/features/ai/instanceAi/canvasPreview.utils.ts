import type { InstanceAiAgentNode } from '@n8n/api-types';

export interface ExecutionResult {
	executionId: string;
	status: 'success' | 'error';
	/** ISO timestamp from the run-workflow tool result. Used to detect stale executions. */
	finishedAt?: string;
}

export interface BuildResult {
	workflowId: string;
	/** Unique per build — changes even when the same workflow is rebuilt. */
	toolCallId: string;
}

export interface BuilderTarget {
	/** Unique per spawn — changes even when a new builder targets the same workflow. */
	agentId: string;
	workflowId: string;
}

export interface WorkflowSetupResult {
	workflowId: string;
	/** Unique per operation — changes even when the same workflow is set up again. */
	toolCallId: string;
}

export interface DataTableResult {
	dataTableId: string;
	/** Unique per operation — changes even when the same table is modified again. */
	toolCallId: string;
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the workflowId
 * and toolCallId from the latest successful build-workflow / submit-workflow tool result.
 */
export function getLatestBuildResult(node: InstanceAiAgentNode): BuildResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestBuildResult(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		if (
			(tc.toolName === 'build-workflow' || tc.toolName === 'submit-workflow') &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			if (result.success === true && typeof result.workflowId === 'string') {
				return { workflowId: result.workflowId, toolCallId: tc.toolCallId };
			}
		}
	}
	return undefined;
}

/** A workflow-builder sub-agent node, identified by kind or role. */
function isBuilderNode(node: InstanceAiAgentNode): boolean {
	return node.kind === 'builder' || node.role === 'workflow-builder';
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the agentId
 * and workflowId of the latest workflow-builder sub-agent that was spawned
 * with a concrete `targetResource.id` — i.e. an edit-mode builder that
 * already knows which existing workflow it is modifying. Used to open the
 * canvas preview at spawn time, before the first build-workflow tool call
 * returns a result.
 */
export function getLatestBuilderTarget(node: InstanceAiAgentNode): BuilderTarget | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const child = node.children[i];
		const nested = getLatestBuilderTarget(child);
		if (nested) return nested;
		if (
			isBuilderNode(child) &&
			child.targetResource?.type === 'workflow' &&
			typeof child.targetResource.id === 'string'
		) {
			return { agentId: child.agentId, workflowId: child.targetResource.id };
		}
	}
	return undefined;
}

const WORKFLOW_SETUP_TOOLS = new Set(['setup-workflow', 'apply-workflow-credentials']);

/**
 * Walks an agent tree depth-first (most recent last) and returns the workflowId
 * (from args) and toolCallId from the latest successful setup-workflow /
 * apply-workflow-credentials tool result. These tools modify the workflow
 * (credentials, parameters) but don't return workflowId in the result.
 */
export function getLatestWorkflowSetupResult(
	node: InstanceAiAgentNode,
): WorkflowSetupResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestWorkflowSetupResult(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		if (
			WORKFLOW_SETUP_TOOLS.has(tc.toolName) &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			const args = tc.args as Record<string, unknown> | undefined;
			if (result.success === true && typeof args?.workflowId === 'string') {
				return { workflowId: args.workflowId, toolCallId: tc.toolCallId };
			}
		}
	}
	return undefined;
}

const WORKFLOW_MUTATING_ACTIONS = new Set(['update', 'restore-version', 'setup']);

/**
 * Walks an agent tree depth-first (most recent last) and returns the workflowId
 * (from args) and toolCallId from the latest successful `workflows` tool call
 * that mutated the workflow definition (action=update / restore-version / setup).
 * These modify an existing workflow but surface under tool name 'workflows' —
 * invisible to getLatestBuildResult — and don't reliably return the workflowId in
 * the result, so it is read from the call args. `setup` is the current path for
 * credential/parameter configuration (the inline setup card); the legacy
 * setup-workflow / apply-workflow-credentials tools are handled by
 * getLatestWorkflowSetupResult.
 */
export function getLatestWorkflowUpdateResult(
	node: InstanceAiAgentNode,
): WorkflowSetupResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestWorkflowUpdateResult(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		const args = tc.args as Record<string, unknown> | undefined;
		if (
			tc.toolName === 'workflows' &&
			typeof args?.action === 'string' &&
			WORKFLOW_MUTATING_ACTIONS.has(args.action) &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			if (result.success === true && typeof args?.workflowId === 'string') {
				return { workflowId: args.workflowId, toolCallId: tc.toolCallId };
			}
		}
	}
	return undefined;
}

const WORKFLOW_EDITING_TOOLS = new Set([
	'build-workflow',
	'build-workflow-with-agent',
	'apply-workflow-credentials',
	'setup-workflow',
]);

/**
 * Whether the agent is actively mutating `workflowId` somewhere in this agent
 * tree — used to lock the artifact canvas while a build/edit is in flight so the
 * user can't drag nodes into a mid-stream conflict. Two signals, either is enough:
 *   1. An active workflow-builder sub-agent targeting the workflow (covers the
 *      whole build window: read file → edit → submit-workflow → verify).
 *   2. An in-flight workflow-mutating tool call targeting the workflow — the
 *      build/setup tools, or a `workflows` update / restore-version / setup action.
 *      Read-only `workflows` actions (get-json, get, list, …) don't lock.
 */
export function isAgentEditingWorkflow(node: InstanceAiAgentNode, workflowId: string): boolean {
	// Signal 1: workflow-builder sub-agent active with our workflow id
	if (
		isBuilderNode(node) &&
		node.status === 'active' &&
		node.targetResource?.type === 'workflow' &&
		node.targetResource.id === workflowId
	) {
		return true;
	}

	// Signal 2: in-flight workflow-mutating tool call targeting our workflow id
	for (const tc of node.toolCalls) {
		if (!tc.isLoading) continue;
		const args = tc.args as { workflowId?: string; action?: string } | undefined;
		if (args?.workflowId !== workflowId) continue;
		if (WORKFLOW_EDITING_TOOLS.has(tc.toolName)) return true;
		if (
			tc.toolName === 'workflows' &&
			typeof args?.action === 'string' &&
			WORKFLOW_MUTATING_ACTIONS.has(args.action)
		) {
			return true;
		}
	}

	for (const child of node.children) {
		if (isAgentEditingWorkflow(child, workflowId)) return true;
	}
	return false;
}

const DATA_TABLE_PREVIEW_ACTIONS = new Set([
	'schema',
	'query',
	'create',
	'insert-rows',
	'update-rows',
	'delete-rows',
	'add-column',
	'delete-column',
	'rename-column',
]);

/** Per-action check that the result contains a table reference worth previewing. */
const RESULT_VALIDATORS: Record<string, (result: Record<string, unknown>) => boolean> = {
	schema: (r) => Array.isArray(r.columns),
	query: (r) => Array.isArray(r.data),
	'insert-rows': (r) => typeof r.insertedCount === 'number',
	'update-rows': (r) => typeof r.updatedCount === 'number',
	'add-column': (r) => r.column !== null && r.column !== undefined && typeof r.column === 'object',
	'delete-rows': (r) => r.success === true,
	'delete-column': (r) => r.success === true,
	'rename-column': (r) => r.success === true,
};

function extractDataTableId(
	action: string,
	result: Record<string, unknown>,
	args: Record<string, unknown> | undefined,
): string | undefined {
	if (action === 'create') {
		if (result.table && typeof result.table === 'object') {
			const table = result.table as Record<string, unknown>;
			if (typeof table.id === 'string') return table.id;
		}
		return undefined;
	}

	const isValid = RESULT_VALIDATORS[action];
	if (isValid?.(result)) {
		if (typeof result.dataTableId === 'string') return result.dataTableId;
		if (typeof args?.dataTableId === 'string') return args.dataTableId;
	}

	return undefined;
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the dataTableId
 * from the latest successful delete-data-table tool result.
 */
export function getLatestDeletedDataTableId(node: InstanceAiAgentNode): string | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestDeletedDataTableId(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		const args = tc.args as Record<string, unknown> | undefined;
		if (
			tc.toolName === 'data-tables' &&
			args?.action === 'delete' &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			if (result.success === true && typeof args?.dataTableId === 'string') {
				return args.dataTableId;
			}
		}
	}
	return undefined;
}

export function getLatestDataTableResult(node: InstanceAiAgentNode): DataTableResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestDataTableResult(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		const args = tc.args as Record<string, unknown> | undefined;
		const action = typeof args?.action === 'string' ? args.action : '';
		if (
			tc.toolName === 'data-tables' &&
			DATA_TABLE_PREVIEW_ACTIONS.has(action) &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			const dataTableId = extractDataTableId(action, result, args);
			if (dataTableId) {
				return { dataTableId, toolCallId: tc.toolCallId };
			}
		}
	}
	return undefined;
}

/**
 * Walks an agent tree and collects the latest completed run-workflow result
 * per workflowId. Used to restore execution status from historical messages
 * after page refresh.
 */
export function getExecutionResultsByWorkflow(
	node: InstanceAiAgentNode,
): Map<string, ExecutionResult> {
	const results = new Map<string, ExecutionResult>();
	collectExecutionResults(node, results);
	return results;
}

function collectExecutionResults(node: InstanceAiAgentNode, results: Map<string, ExecutionResult>) {
	// Process parent's own toolCalls first, then children — children's results
	// are more recent (the orchestrator delegates to children) and should win.
	for (const tc of node.toolCalls) {
		const tcArgs = tc.args as Record<string, unknown> | undefined;
		if (!(tc.toolName === 'executions' && tcArgs?.action === 'run') || tc.isLoading) continue;
		const result = tc.result;
		const args = tc.args;
		if (
			typeof result === 'object' &&
			result !== null &&
			typeof args === 'object' &&
			args !== null &&
			'workflowId' in args &&
			typeof args.workflowId === 'string' &&
			'executionId' in result &&
			typeof result.executionId === 'string' &&
			'status' in result &&
			(result.status === 'success' || result.status === 'error')
		) {
			results.set(args.workflowId, {
				executionId: result.executionId,
				status: result.status,
				...('finishedAt' in result && typeof result.finishedAt === 'string'
					? { finishedAt: result.finishedAt }
					: {}),
			});
		}
	}
	for (const child of node.children) {
		collectExecutionResults(child, results);
	}
}
