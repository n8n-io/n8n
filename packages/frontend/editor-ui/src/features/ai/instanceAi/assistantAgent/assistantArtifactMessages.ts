import {
	tasksUpdatePayloadSchema,
	type InstanceAiAgentNode,
	type InstanceAiMessage,
	type InstanceAiToolCallState,
	type TaskList,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { DeepReadonly } from 'vue';

import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

/** The chat panel exposes its messages read-only. */
type ReadonlyChatMessages = ReadonlyArray<DeepReadonly<ChatMessage>>;

/**
 * Maps Agents chat messages to the Assistant message shape that the artifacts
 * panel and the artifact previews read. The Agents chat has no sub-agent tree,
 * so each assistant message becomes one orchestrator node with the flat tool
 * calls of the message. The tool names, inputs and outputs are the same as in
 * the Assistant runtime.
 */

const ORCHESTRATOR_AGENT_ID = 'agent-001';

const IN_FLIGHT_STATES = new Set<ToolCall['state']>([
	TOOL_CALL_STATE.PENDING,
	TOOL_CALL_STATE.RUNNING,
	TOOL_CALL_STATE.SUSPENDED,
]);

function toIsoString(epochMs: number | undefined): string | undefined {
	return epochMs === undefined ? undefined : new Date(epochMs).toISOString();
}

function toolCallError(toolCall: DeepReadonly<ToolCall>): string | undefined {
	if (toolCall.state !== TOOL_CALL_STATE.ERROR) return undefined;
	if (typeof toolCall.output === 'string' && toolCall.output) return toolCall.output;
	if (isRecord(toolCall.output) && typeof toolCall.output.error === 'string') {
		return toolCall.output.error;
	}
	return 'Tool call failed';
}

export function toAssistantToolCall(toolCall: DeepReadonly<ToolCall>): InstanceAiToolCallState {
	const error = toolCallError(toolCall);
	return {
		toolCallId: toolCall.toolCallId,
		toolName: toolCall.tool,
		args: isRecord(toolCall.input) ? toolCall.input : {},
		// A failed call has no result. The readers check `result.success` and would
		// read an error payload as a result.
		...(error === undefined ? { result: toolCall.output } : { error }),
		isLoading: IN_FLIGHT_STATES.has(toolCall.state),
	};
}

/** The latest task list of the thread, from the `tasks-update` host events. */
export function findLatestAssistantTasks(messages: ReadonlyChatMessages): TaskList | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const events = messages[i].hostEvents ?? [];
		for (let j = events.length - 1; j >= 0; j--) {
			if (events[j].name !== 'tasks-update') continue;
			const parsed = tasksUpdatePayloadSchema.safeParse(events[j].payload);
			if (parsed.success) return parsed.data.tasks;
		}
	}
	return null;
}

function toAgentTree(message: DeepReadonly<ChatMessage>, isLive: boolean): InstanceAiAgentNode {
	const status: InstanceAiAgentNode['status'] = isLive
		? 'active'
		: message.status === CHAT_MESSAGE_STATUS.ERROR
			? 'error'
			: 'completed';
	return {
		agentId: ORCHESTRATOR_AGENT_ID,
		role: 'orchestrator',
		status,
		// The readers do not use the text. Without it, a streamed text delta does
		// not change the tree.
		textContent: '',
		reasoning: '',
		toolCalls: (message.toolCalls ?? []).map(toAssistantToolCall),
		children: [],
		timeline: [],
	};
}

/**
 * Builds Assistant messages from Agents chat messages. While the chat streams,
 * the latest assistant message is the live one.
 */
export function toAssistantArtifactMessages(
	messages: ReadonlyChatMessages,
	isStreaming: boolean,
): InstanceAiMessage[] {
	const liveIndex = isStreaming ? messages.findLastIndex((m) => m.role === 'assistant') : -1;

	return messages.map((message, index): InstanceAiMessage => {
		const createdAt = toIsoString(message.createdAt) ?? new Date(0).toISOString();
		if (message.role === 'user') {
			return {
				id: message.id,
				role: 'user',
				createdAt,
				content: message.content,
				reasoning: '',
				isStreaming: false,
			};
		}
		const isLive = index === liveIndex;
		return {
			id: message.id,
			role: 'assistant',
			createdAt,
			content: '',
			reasoning: '',
			isStreaming: isLive,
			agentTree: toAgentTree(message, isLive),
		};
	});
}
