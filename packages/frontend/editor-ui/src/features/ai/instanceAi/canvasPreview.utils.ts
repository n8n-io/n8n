import type { InstanceAiAgentNode } from '@n8n/api-types';

export interface BuildResult {
	workflowId: string;
	/** Unique per build — changes even when the same workflow is rebuilt. */
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

/**
 * Walks an agent tree depth-first (most recent last) and returns the executionId
 * from the latest completed run-workflow tool result.
 */
export function getLatestExecutionId(node: InstanceAiAgentNode): string | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestExecutionId(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		if (
			tc.toolName === 'run-workflow' &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			if (typeof result.executionId === 'string') {
				return result.executionId;
			}
		}
	}
	return undefined;
}

const DATA_TABLE_TOOL_NAMES = new Set([
	'create-data-table',
	'insert-data-table-rows',
	'update-data-table-rows',
	'delete-data-table-rows',
	'add-data-table-column',
	'delete-data-table-column',
	'rename-data-table-column',
	'move-data-table-column',
]);

/** Per-tool check that the result indicates a successful mutation. */
const RESULT_VALIDATORS: Record<string, (result: Record<string, unknown>) => boolean> = {
	'insert-data-table-rows': (r) => typeof r.insertedCount === 'number',
	'update-data-table-rows': (r) => typeof r.updatedCount === 'number',
	'add-data-table-column': (r) => r.column != null && typeof r.column === 'object',
	'delete-data-table-rows': (r) => r.success === true,
	'delete-data-table-column': (r) => r.success === true,
	'rename-data-table-column': (r) => r.success === true,
	'move-data-table-column': (r) => r.success === true,
};

function extractDataTableId(
	toolName: string,
	result: Record<string, unknown>,
	args: Record<string, unknown> | undefined,
): string | undefined {
	if (toolName === 'create-data-table') {
		if (result.table && typeof result.table === 'object') {
			const table = result.table as Record<string, unknown>;
			if (typeof table.id === 'string') return table.id;
		}
		return undefined;
	}

	const isValid = RESULT_VALIDATORS[toolName];
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
		if (
			tc.toolName === 'delete-data-table' &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			const args = tc.args as Record<string, unknown> | undefined;
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
		if (
			DATA_TABLE_TOOL_NAMES.has(tc.toolName) &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			const args = tc.args as Record<string, unknown> | undefined;
			const dataTableId = extractDataTableId(tc.toolName, result, args);
			if (dataTableId) {
				return { dataTableId, toolCallId: tc.toolCallId };
			}
		}
	}
	return undefined;
}
