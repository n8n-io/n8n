import {
	AGENT_BUILDER_TOOL_NAMES,
	resolveBuilderToolName,
	toolCallSimulationSchema,
	type InstanceAiToolCallState,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentAssistantTestRunCall } from '@/features/agents/assistantTestRun.types';
import type { WouldHaveHappenedPreviewInput } from '@/features/agents/components/testRun/wouldHaveHappened.types';

export interface AssistantTestRunCardView {
	agentId?: string;
	projectId?: string;
	agentName?: string;
	testChatId?: string;
	calls: AgentAssistantTestRunCall[];
}

function isCallAgentToolCall(tc: InstanceAiToolCallState): boolean {
	return resolveBuilderToolName(tc.toolName) === AGENT_BUILDER_TOOL_NAMES.CALL_AGENT;
}

function parsePreview(value: unknown): WouldHaveHappenedPreviewInput | undefined {
	if (!isRecord(value)) return undefined;
	if (typeof value.kind !== 'string' || value.kind.trim().length === 0) return undefined;
	if (typeof value.toolName !== 'string' || value.toolName.trim().length === 0) return undefined;
	return {
		...value,
		kind: value.kind,
		toolName: value.toolName,
	};
}

function parseSimulatedCall(item: unknown): AgentAssistantTestRunCall | null {
	if (!isRecord(item)) return null;
	if (typeof item.toolCallId !== 'string' || typeof item.toolName !== 'string') return null;

	const parsedSimulation = toolCallSimulationSchema.safeParse({
		route: item.route,
		reason: item.reason,
		...(item.detail !== undefined ? { detail: item.detail } : {}),
		...(item.evidence !== undefined ? { evidence: item.evidence } : {}),
	});

	const simulation = parsedSimulation.success ? parsedSimulation.data : undefined;
	const preview =
		simulation && (simulation.route === 'simulated' || simulation.route === 'simulated_made_up')
			? parsePreview(item.preview)
			: undefined;

	return {
		toolCallId: item.toolCallId,
		toolName: item.toolName,
		...(simulation ? { simulation } : {}),
		...(preview ? { preview } : {}),
	};
}

function parseLocalCall(item: unknown): AgentAssistantTestRunCall | null {
	if (!isRecord(item)) return null;
	if (typeof item.toolCallId !== 'string' || typeof item.toolName !== 'string') return null;
	return {
		toolCallId: item.toolCallId,
		toolName: item.toolName,
	};
}

/**
 * Extracts card data from a finished simulated `agent_builder_call_agent` tool result.
 * Returns null while the tool call is still loading or when the result does not confirm
 * that the run was simulated.
 */
export function resolveAssistantTestRunCard(
	tc: InstanceAiToolCallState,
): AssistantTestRunCardView | null {
	if (!isCallAgentToolCall(tc) || tc.isLoading) return null;
	if (!isRecord(tc.result) || tc.result.simulated !== true) return null;

	const calls: AgentAssistantTestRunCall[] = [];
	const seenIds = new Set<string>();

	if (isRecord(tc.result.simulation)) {
		if (Array.isArray(tc.result.simulation.toolCalls)) {
			for (const raw of tc.result.simulation.toolCalls) {
				const parsed = parseSimulatedCall(raw);
				if (parsed && !seenIds.has(parsed.toolCallId)) {
					seenIds.add(parsed.toolCallId);
					calls.push(parsed);
				}
			}
		}
		if (Array.isArray(tc.result.simulation.localToolCalls)) {
			for (const raw of tc.result.simulation.localToolCalls) {
				const parsed = parseLocalCall(raw);
				if (parsed && !seenIds.has(parsed.toolCallId)) {
					seenIds.add(parsed.toolCallId);
					calls.push(parsed);
				}
			}
		}
	}

	const agentId =
		typeof tc.result.agentId === 'string' && tc.result.agentId.trim().length > 0
			? tc.result.agentId.trim()
			: undefined;
	const projectId =
		typeof tc.result.projectId === 'string' && tc.result.projectId.trim().length > 0
			? tc.result.projectId.trim()
			: undefined;
	const agentName =
		typeof tc.result.agentName === 'string' && tc.result.agentName.trim().length > 0
			? tc.result.agentName.trim()
			: undefined;
	const testChatId =
		typeof tc.result.sessionId === 'string' && tc.result.sessionId.trim().length > 0
			? tc.result.sessionId.trim()
			: undefined;

	return {
		...(agentId ? { agentId } : {}),
		...(projectId ? { projectId } : {}),
		...(agentName ? { agentName } : {}),
		...(testChatId ? { testChatId } : {}),
		calls,
	};
}

/** True when a tool call is a completed simulated assistant test run that renders a card. */
export function isSimulatedTestRunOutcome(tc: InstanceAiToolCallState): boolean {
	return resolveAssistantTestRunCard(tc) !== null;
}
