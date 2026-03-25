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
	'add-data-table-column',
]);

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

	if (toolName === 'insert-data-table-rows' && typeof result.insertedCount === 'number') {
		return typeof args?.dataTableId === 'string' ? args.dataTableId : undefined;
	}

	if (toolName === 'update-data-table-rows' && typeof result.updatedCount === 'number') {
		return typeof args?.dataTableId === 'string' ? args.dataTableId : undefined;
	}

	if (toolName === 'add-data-table-column' && result.column && typeof result.column === 'object') {
		return typeof args?.dataTableId === 'string' ? args.dataTableId : undefined;
	}

	return undefined;
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the dataTableId
 * and toolCallId from the latest successful data-table tool result.
 */
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
