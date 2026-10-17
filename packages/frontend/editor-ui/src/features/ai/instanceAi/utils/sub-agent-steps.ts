import type { InstanceAiRunDebugStep, InstanceAiRunDebugSubAgent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

/** Tool call ids that one orchestrator step emitted, from `toolCalls` and `content` parts. */
function stepToolCallIds(step: InstanceAiRunDebugStep): Set<string> {
	const ids = new Set<string>();
	const output = step.output;
	if (!output) return ids;

	for (const list of [output.toolCalls, output.content]) {
		if (!Array.isArray(list)) continue;
		for (const part of list) {
			if (isRecord(part) && typeof part.toolCallId === 'string') {
				if (list === output.content && part.type !== 'tool-call') continue;
				ids.add(part.toolCallId);
			}
		}
	}
	return ids;
}

/**
 * Maps each orchestrator step number to the sub-agents that its tool calls started.
 * Links by tool call id first. A sub-agent without a matching step (for example a
 * resumed builder turn) falls back to the step that was last recorded when it
 * started, and then to the first step of the run.
 */
export function mapSubAgentsByStepNumber(
	steps: InstanceAiRunDebugStep[],
	subAgents: InstanceAiRunDebugSubAgent[],
): Map<number, InstanceAiRunDebugSubAgent[]> {
	const map = new Map<number, InstanceAiRunDebugSubAgent[]>();
	if (steps.length === 0 || subAgents.length === 0) return map;

	const stepByToolCallId = new Map<string, number>();
	for (const step of steps) {
		for (const id of stepToolCallIds(step)) stepByToolCallId.set(id, step.stepNumber);
	}
	const stepNumbers = new Set(steps.map((step) => step.stepNumber));

	for (const subAgent of subAgents) {
		const byToolCall =
			subAgent.parentToolCallId !== undefined
				? stepByToolCallId.get(subAgent.parentToolCallId)
				: undefined;
		const byPosition =
			subAgent.afterStepNumber !== undefined && stepNumbers.has(subAgent.afterStepNumber)
				? subAgent.afterStepNumber
				: undefined;
		const stepNumber = byToolCall ?? byPosition ?? steps[0].stepNumber;

		const linked = map.get(stepNumber) ?? [];
		linked.push(subAgent);
		map.set(stepNumber, linked);
	}

	return map;
}
