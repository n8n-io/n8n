import { isRecord } from '@n8n/utils/is-record';

import type { CapturedToolCall } from '../types';

const SAVE_TOOLS = new Set(['build-workflow', 'submit-workflow', 'patch-workflow']);

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
 *  nor seeded: another build's work, reachable through a shared view. */
export function findForeignWorkflowReads(
	toolCalls: CapturedToolCall[],
	seededWorkflowIds: string[],
): string[] {
	const calls = toolCalls.filter(succeeded);
	const own = new Set(seededWorkflowIds);
	for (const call of calls) {
		// A save without a target workflow creates one.
		if (!SAVE_TOOLS.has(call.toolName) || call.args.workflowId !== undefined) continue;
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
