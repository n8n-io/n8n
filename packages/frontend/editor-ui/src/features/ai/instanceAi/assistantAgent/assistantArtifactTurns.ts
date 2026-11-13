import {
	ASSISTANT_WORKFLOWS_ARCHIVED_EVENT,
	setupItemsPayloadSchema,
	tasksUpdatePayloadSchema,
	unwrapToolCatalogCall,
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
	// The readers match tool names, so read a tool catalog `call_tool` call as the tool it runs.
	const { toolName, args } = unwrapToolCatalogCall(
		toolCall.tool,
		isRecord(toolCall.input) ? toolCall.input : {},
	);
	return {
		toolCallId: toolCall.toolCallId,
		toolName,
		args,
		// A failed call has no result. The readers check `result.success` and would
		// read an error payload as a result.
		...(error === undefined ? { result: toolCall.output } : { error }),
		isLoading: IN_FLIGHT_STATES.has(toolCall.state),
	};
}

/**
 * Adds the tool calls of a later message to a turn. The chat stores a message
 * when a stream suspends and again when it completes, so the history can hold
 * the same call twice: open, then resolved. The later copy replaces the
 * earlier one, so an open copy does not keep the call in flight.
 */
function appendToolCalls(turnCalls: ArtifactToolCall[], next: ArtifactToolCall[]): void {
	for (const toolCall of next) {
		const index = toolCall.toolCallId
			? turnCalls.findIndex((call) => call.toolCallId === toolCall.toolCallId)
			: -1;
		if (index === -1) {
			turnCalls.push(toolCall);
			continue;
		}
		const previous = turnCalls[index];
		turnCalls[index] = {
			...toolCall,
			args: Object.keys(toolCall.args).length > 0 ? toolCall.args : previous.args,
		};
	}
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
 * Builds the artifact turns from Agents chat messages. The chat adds a message
 * for each model step, so the assistant messages after a user message make one
 * turn, as on the current runtime. A lock that one step starts, such as an
 * agent selection, then lasts until the run ends. While the chat streams, the
 * latest assistant turn is the live one.
 */
export function toAssistantArtifactTurns(
	messages: ReadonlyChatMessages,
	isStreaming: boolean,
): ArtifactTurn[] {
	const turns: ArtifactTurn[] = [];
	for (const message of messages) {
		if (message.role === 'user') {
			turns.push({ id: message.id, role: 'user', isLive: false, toolCalls: [] });
			continue;
		}
		const toolCalls = (message.toolCalls ?? []).map(toArtifactToolCall);
		const announcedWorkflowId = findAnnouncedWorkflowId(message);
		const current = turns.at(-1);
		if (current?.role === 'assistant') {
			appendToolCalls(current.toolCalls, toolCalls);
			if (announcedWorkflowId) current.announcedWorkflowId = announcedWorkflowId;
			continue;
		}
		turns.push({
			id: message.id,
			role: 'assistant',
			isLive: false,
			toolCalls,
			...(announcedWorkflowId ? { announcedWorkflowId } : {}),
		});
	}

	const live = isStreaming ? turns.at(-1) : undefined;
	if (live?.role === 'assistant') live.isLive = true;
	return turns;
}
