import { resolveBuilderToolName } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import { builderToolAgentId, WORKFLOW_TOOLS } from './event-parser';
import type { CapturedToolCall } from '../types';

function toRecord(result: unknown): Record<string, unknown> | undefined {
	if (isRecord(result)) return result;
	if (typeof result !== 'string') return undefined;
	try {
		const parsed: unknown = JSON.parse(result);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function succeeded(call: CapturedToolCall): boolean {
	const result = toRecord(call.result);
	return call.error === undefined && result?.success !== false && typeof result?.error !== 'string';
}

/** Workflow ids the agent successfully read or changed that this build neither created
 *  nor seeded: another build's work, reachable through a shared view. `seededIds` holds
 *  the seeded workflows and Agents: a tool such as `setup_credentials` with
 *  `target: "agent"` can pass an Agent's id as `workflowId`. */
export function findForeignWorkflowReads(
	toolCalls: CapturedToolCall[],
	seededIds: string[],
): string[] {
	const calls = toolCalls.filter(succeeded);
	const own = new Set(seededIds);
	for (const call of calls) {
		const toolName = resolveBuilderToolName(call.toolName);
		const agentId = builderToolAgentId(toolName, call.result);
		if (agentId) own.add(agentId);
		// A save without a target workflow creates one.
		if (!WORKFLOW_TOOLS.has(toolName) || call.args.workflowId !== undefined) continue;
		const result = toRecord(call.result);
		const id = result?.workflowId ?? result?.id;
		if (typeof id === 'string') own.add(id);
	}

	const seen = calls.flatMap((call) => {
		const target = typeof call.args.workflowId === 'string' ? [call.args.workflowId] : [];
		const listed = toRecord(call.result)?.workflows;
		const listedIds = Array.isArray(listed)
			? listed.flatMap((workflow) =>
					isRecord(workflow) && typeof workflow.id === 'string' ? [workflow.id] : [],
				)
			: [];
		return [...target, ...listedIds];
	});
	return [...new Set(seen.filter((id) => !own.has(id)))];
}
