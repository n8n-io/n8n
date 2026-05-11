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

export interface LatestExecution {
	executionId: string;
	workflowId: string;
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the executionId
 * and workflowId from the latest completed run-workflow tool result.
 *
 * The workflowId preference order is:
 *   1. The sibling build-workflow tool's result.workflowId (always the real
 *      current-run ID, since build-workflow hits the live backend).
 *   2. The run-workflow tool call's args.workflowId (falls back for flows that
 *      run a pre-existing workflow without building it first).
 *
 * This ordering matters for trace-replay: the cached LLM's args.workflowId
 * carries the ID from the original recording, but build-workflow's result
 * always reflects the real workflow created during replay.
 */
export function getLatestExecutionId(node: InstanceAiAgentNode): LatestExecution | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestExecutionId(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		if (
			tc.toolName === 'executions' &&
			(tc.args as Record<string, unknown> | undefined)?.action === 'run' &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			if (typeof result.executionId !== 'string') continue;

			const buildResult = getLatestBuildResult(node);
			const args = tc.args as Record<string, unknown> | undefined;
			const workflowId =
				buildResult?.workflowId ??
				(typeof args?.workflowId === 'string' ? args.workflowId : undefined);
			if (!workflowId) continue;

			return { executionId: result.executionId, workflowId };
		}
	}
	return undefined;
}

const DATA_TABLE_MUTATION_ACTIONS = new Set([
	'create',
	'insert-rows',
	'update-rows',
	'delete-rows',
	'add-column',
	'delete-column',
	'rename-column',
]);

/** Per-action check that the result indicates a successful mutation. */
const RESULT_VALIDATORS: Record<string, (result: Record<string, unknown>) => boolean> = {
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
	if (isValid?.(result) && typeof args?.dataTableId === 'string') {
		return args.dataTableId;
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
			DATA_TABLE_MUTATION_ACTIONS.has(action) &&
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
