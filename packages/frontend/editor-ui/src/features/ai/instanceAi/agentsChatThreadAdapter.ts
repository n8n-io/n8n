import {
	taskListSchema,
	type InstanceAiAgentNode,
	type InstanceAiMessage,
	type InstanceAiToolCallState,
	type TaskList,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import { getTailSegments } from '@/features/ai/shared/agentsChat/messageSegments';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

/**
 * Adapts Agents chat messages to the legacy Assistant message shape, so the
 * thread side panels (artifacts, preview tabs, to-do list, editing locks) can
 * read them without the legacy event stream.
 *
 * The Agents chat has no sub-agent tree: every turn becomes one orchestrator
 * node that holds the turn's flat tool calls. The tool names, inputs and
 * outputs are the same objects the legacy tree carried.
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

function toolCallError(toolCall: ToolCall): string | undefined {
	if (toolCall.state !== TOOL_CALL_STATE.ERROR) return undefined;
	if (typeof toolCall.output === 'string' && toolCall.output) return toolCall.output;
	if (isRecord(toolCall.output) && typeof toolCall.output.error === 'string') {
		return toolCall.output.error;
	}
	return 'Tool call failed';
}

export function toInstanceAiToolCall(toolCall: ToolCall): InstanceAiToolCallState {
	const error = toolCallError(toolCall);
	const startedAt = toIsoString(toolCall.startTime);
	const completedAt = toIsoString(toolCall.endTime);
	return {
		toolCallId: toolCall.toolCallId,
		toolName: toolCall.tool,
		args: isRecord(toolCall.input) ? toolCall.input : {},
		// A failed call has no result in the legacy shape. Consumers check
		// `result.success` and would misread an error payload as a result.
		...(error === undefined ? { result: toolCall.output } : { error }),
		isLoading: IN_FLIGHT_STATES.has(toolCall.state),
		...(startedAt ? { startedAt } : {}),
		...(completedAt ? { completedAt } : {}),
	};
}

function readChecklist(input: unknown): TaskList | undefined {
	if (!isRecord(input) || input.action !== 'update-checklist') return undefined;
	const parsed = taskListSchema.safeParse({ tasks: input.tasks });
	return parsed.success ? parsed.data : undefined;
}

/**
 * The agent's own checklist, derived from the tool calls in order. `task-control`
 * writes the whole checklist in its input, so its latest successful call is the
 * state. A `create-tasks` plan replaces it with planned tasks, which the backend
 * keeps in thread metadata (`instanceAiTasks`), so the runtime reads those
 * instead and this checklist clears.
 */
export function deriveTasksFromAgentsChat(messages: readonly ChatMessage[]): TaskList | null {
	let tasks: TaskList | null = null;
	for (const message of messages) {
		for (const toolCall of message.toolCalls ?? []) {
			if (toolCall.tool === 'create-tasks') {
				tasks = null;
				continue;
			}
			if (toolCall.tool !== 'task-control') continue;
			if (toolCall.state === TOOL_CALL_STATE.ERROR || toolCall.canceled) continue;
			const checklist = readChecklist(toolCall.input);
			if (checklist) tasks = checklist;
		}
	}
	return tasks;
}

function toAgentTree(
	message: ChatMessage,
	isLiveTurn: boolean,
	tasks: TaskList | null,
): InstanceAiAgentNode {
	const status: InstanceAiAgentNode['status'] = isLiveTurn
		? 'active'
		: message.status === CHAT_MESSAGE_STATUS.ERROR
			? 'error'
			: 'completed';
	return {
		agentId: ORCHESTRATOR_AGENT_ID,
		role: 'orchestrator',
		status,
		// The panels do not read the text. Leaving it out keeps the mirror from
		// rebuilding on every streamed text delta.
		textContent: '',
		reasoning: '',
		toolCalls: (message.toolCalls ?? []).map(toInstanceAiToolCall),
		children: [],
		timeline: [],
		...(tasks ? { tasks } : {}),
	};
}

/**
 * Build legacy-shaped messages from Agents chat messages. `isStreaming` marks
 * the latest assistant turn as the live one, which drives the editing locks.
 * The chat splits one output into text and tool-call segments, so every
 * segment of the latest output is live.
 */
export function agentsChatToThreadMessages(
	messages: readonly ChatMessage[],
	isStreaming: boolean,
): InstanceAiMessage[] {
	let lastAssistantIndex = -1;
	messages.forEach((message, index) => {
		if (message.role === 'assistant') lastAssistantIndex = index;
	});
	const liveIds = new Set(
		isStreaming
			? getTailSegments(messages.slice(0, lastAssistantIndex + 1)).map((message) => message.id)
			: [],
	);
	const tasks = deriveTasksFromAgentsChat(messages);

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
		const isLiveTurn = liveIds.has(message.id);
		return {
			id: message.id,
			role: 'assistant',
			createdAt,
			content: '',
			reasoning: '',
			isStreaming: isLiveTurn,
			agentTree: toAgentTree(message, isLiveTurn, index === lastAssistantIndex ? tasks : null),
		};
	});
}
