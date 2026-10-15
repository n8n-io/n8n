import { isRecord } from '@n8n/utils/is-record';

import { WORKFLOW_TOOLS } from './event-parser';
import { isMcpToolResult, N8N_MCP_SEARCH_WORKFLOWS_TOOL, toToolResultRecord } from './tool-result';
import type { CapturedToolCall } from '../types';

function succeeded(call: CapturedToolCall): boolean {
	const result = toToolResultRecord(call.result);
	// A failed MCP call can return plain error text, which parses to no record.
	if (result === undefined && isMcpToolResult(call.result)) return false;
	return call.error === undefined && result?.success !== false && typeof result?.error !== 'string';
}

function listedWorkflows(call: CapturedToolCall): unknown {
	const result = toToolResultRecord(call.result);
	return call.toolName === N8N_MCP_SEARCH_WORKFLOWS_TOOL ? result?.data : result?.workflows;
}

/** Workflow ids the agent successfully read or changed that this build neither created
 *  nor seeded: another build's work, reachable through a shared view. */
export function findForeignWorkflowReads(
	toolCalls: CapturedToolCall[],
	seededWorkflowIds: string[],
): string[] {
	const calls = toolCalls.filter(succeeded);
	const own = new Set(seededWorkflowIds);
	for (const call of calls) {
		// A save without a target workflow creates one.
		if (!WORKFLOW_TOOLS.has(call.toolName) || call.args.workflowId !== undefined) continue;
		const result = toToolResultRecord(call.result);
		const id = result?.workflowId ?? result?.id;
		if (typeof id === 'string') own.add(id);
	}

	const seen = calls.flatMap((call) => {
		const target = typeof call.args.workflowId === 'string' ? [call.args.workflowId] : [];
		const listed = listedWorkflows(call);
		const listedIds = Array.isArray(listed)
			? listed.flatMap((workflow) =>
					isRecord(workflow) && typeof workflow.id === 'string' ? [workflow.id] : [],
				)
			: [];
		return [...target, ...listedIds];
	});
	return [...new Set(seen.filter((id) => !own.has(id)))];
}
