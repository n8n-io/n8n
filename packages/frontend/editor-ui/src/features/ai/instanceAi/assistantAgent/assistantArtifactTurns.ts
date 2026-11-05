import {
	ASSISTANT_WORKFLOWS_ARCHIVED_EVENT,
	setupItemsPayloadSchema,
	tasksUpdatePayloadSchema,
	workflowsArchivedPayloadSchema,
	type TaskList,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { DeepReadonly } from 'vue';

import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

import type { ArtifactToolCall, ArtifactTurn } from '../artifactTurns';

/** The chat panel exposes its messages read-only. */
type ReadonlyChatMessages = ReadonlyArray<DeepReadonly<ChatMessage>>;

/**
 * Maps Agents chat messages to the input of the artifact readers: the
 * artifacts panel, the previews and the resource registry. The tool names,
 * inputs and outputs are the same as in the Assistant runtime.
 */

const IN_FLIGHT_STATES = new Set<ToolCall['state']>([
	TOOL_CALL_STATE.PENDING,
	TOOL_CALL_STATE.RUNNING,
	TOOL_CALL_STATE.SUSPENDED,
]);

function toolCallError(toolCall: DeepReadonly<ToolCall>): string | undefined {
	if (toolCall.state !== TOOL_CALL_STATE.ERROR) return undefined;
	if (typeof toolCall.output === 'string' && toolCall.output) return toolCall.output;
	if (isRecord(toolCall.output) && typeof toolCall.output.error === 'string') {
		return toolCall.output.error;
	}
	return 'Tool call failed';
}

export function toArtifactToolCall(toolCall: DeepReadonly<ToolCall>): ArtifactToolCall {
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

/**
 * The workflows that the turn ends of the thread archived, from the
 * `workflows-archived` host events. The artifacts panel marks them as archived.
 */
export function findArchivedAssistantWorkflowIds(messages: ReadonlyChatMessages): Set<string> {
	const workflowIds = new Set<string>();
	for (const message of messages) {
		for (const event of message.hostEvents ?? []) {
			if (event.name !== ASSISTANT_WORKFLOWS_ARCHIVED_EVENT) continue;
			const parsed = workflowsArchivedPayloadSchema.safeParse(event.payload);
			if (parsed.success) for (const id of parsed.data.workflowIds) workflowIds.add(id);
		}
	}
	return workflowIds;
}

/** The latest workflow of the turn's `setup-items` host events. */
function findAnnouncedWorkflowId(message: DeepReadonly<ChatMessage>): string | undefined {
	const events = message.hostEvents ?? [];
	for (let i = events.length - 1; i >= 0; i--) {
		if (events[i].name !== 'setup-items') continue;
		const parsed = setupItemsPayloadSchema.safeParse(events[i].payload);
		if (parsed.success) return parsed.data.workflowId;
	}
	return undefined;
}

/**
 * Builds the artifact turns from Agents chat messages. While the chat streams,
 * the latest assistant message is the live one.
 */
export function toAssistantArtifactTurns(
	messages: ReadonlyChatMessages,
	isStreaming: boolean,
): ArtifactTurn[] {
	const liveIndex = isStreaming ? messages.findLastIndex((m) => m.role === 'assistant') : -1;

	return messages.map((message, index): ArtifactTurn => {
		if (message.role === 'user') {
			return { id: message.id, role: 'user', isLive: false, toolCalls: [] };
		}
		const announcedWorkflowId = findAnnouncedWorkflowId(message);
		return {
			id: message.id,
			role: 'assistant',
			isLive: index === liveIndex,
			toolCalls: (message.toolCalls ?? []).map(toArtifactToolCall),
			...(announcedWorkflowId ? { announcedWorkflowId } : {}),
		};
	});
}
