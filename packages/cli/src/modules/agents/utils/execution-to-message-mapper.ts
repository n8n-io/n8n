import type { AgentPersistedMessageContentPart, AgentPersistedMessageDto } from '@n8n/api-types';
import { isRecord } from '@n8n/utils';

import type { AgentExecution } from '../entities/agent-execution.entity';
import type { RecordedToolCall, TimelineEvent } from '../execution-recorder';

type ExecutionTranscript = Pick<
	AgentExecution,
	'id' | 'userMessage' | 'assistantResponse' | 'toolCalls' | 'timeline' | 'error'
>;

type ToolCallTimelineEvent = Extract<TimelineEvent, { type: 'tool-call' }>;
type ToolCallContentPart = AgentPersistedMessageContentPart & {
	type: 'tool-call';
	toolCallId: string;
};

function textPart(text: string): AgentPersistedMessageContentPart | null {
	if (!text.trim()) return null;
	return { type: 'text', text };
}

function textMessageDto(
	id: string,
	role: AgentPersistedMessageDto['role'],
	text: string,
): AgentPersistedMessageDto | null {
	const contentPart = textPart(text);
	if (!contentPart) return null;

	return {
		id,
		role,
		content: [contentPart],
	};
}

function toolCallState(event: ToolCallTimelineEvent): 'resolved' | 'rejected' | undefined {
	if (typeof event.endTime !== 'number' || event.endTime <= 0) return undefined;
	return event.success ? 'resolved' : 'rejected';
}

function isToolCallWithId(part: AgentPersistedMessageContentPart): part is ToolCallContentPart {
	return part.type === 'tool-call' && typeof part.toolCallId === 'string' && part.toolCallId !== '';
}

function isTerminalToolCallPart(part: ToolCallContentPart): boolean {
	return (
		part.state === 'resolved' ||
		part.state === 'rejected' ||
		part.canceled === true ||
		part.output !== undefined ||
		part.error !== undefined
	);
}

function mergeTerminalToolCallPart(
	previous: ToolCallContentPart,
	terminal: ToolCallContentPart,
): ToolCallContentPart {
	return {
		...previous,
		...terminal,
		input: previous.input ?? terminal.input,
		startTime: previous.startTime ?? terminal.startTime,
		endTime: terminal.endTime ?? previous.endTime,
		canceled: terminal.canceled ?? previous.canceled,
	};
}

function toolErrorMessage(output: unknown): string | undefined {
	if (typeof output === 'string' && output.trim()) return output;

	if (isRecord(output)) {
		const message = output.message;
		if (typeof message === 'string' && message.trim()) return message;

		const error = output.error;
		if (typeof error === 'string' && error.trim()) return error;
	}

	if (output === undefined || output === null) return undefined;

	try {
		return JSON.stringify(output);
	} catch {
		return String(output);
	}
}

function timelineToolCallToPart(event: ToolCallTimelineEvent): AgentPersistedMessageContentPart {
	const state = toolCallState(event);
	const base: AgentPersistedMessageContentPart = {
		type: 'tool-call',
		toolName: event.name,
		toolCallId: event.toolCallId,
		input: event.input,
		...(event.startTime > 0 ? { startTime: event.startTime } : {}),
		...(event.endTime > 0 ? { endTime: event.endTime } : {}),
	};

	if (state === undefined) return base;
	if (state === 'resolved') {
		return {
			...base,
			state,
			output: event.output,
		};
	}

	return {
		...base,
		state,
		error: toolErrorMessage(event.output) ?? `Tool "${event.name}" failed`,
	};
}

function recordedToolCallToPart(
	executionId: string,
	index: number,
	toolCall: RecordedToolCall,
): AgentPersistedMessageContentPart {
	const base: AgentPersistedMessageContentPart = {
		type: 'tool-call',
		toolName: toolCall.name,
		toolCallId: `${executionId}:tool:${index}`,
		input: toolCall.input,
	};

	if (toolCall.output === undefined) return base;

	return {
		...base,
		output: toolCall.output,
	};
}

function assistantContentFromExecution(
	execution: ExecutionTranscript,
): AgentPersistedMessageContentPart[] {
	const content: AgentPersistedMessageContentPart[] = [];
	let hasTimelineText = false;
	let hasTimelineToolCalls = false;

	for (const event of execution.timeline ?? []) {
		if (event.type === 'text') {
			const part = textPart(event.content);
			if (!part) continue;

			hasTimelineText = true;
			content.push(part);
		} else if (event.type === 'tool-call') {
			hasTimelineToolCalls = true;
			content.push(timelineToolCallToPart(event));
		}
	}

	if (!hasTimelineToolCalls) {
		for (const [index, toolCall] of (execution.toolCalls ?? []).entries()) {
			content.push(recordedToolCallToPart(execution.id, index, toolCall));
		}
	}

	if (!hasTimelineText) {
		const fallbackText =
			execution.assistantResponse || (execution.error ? `Error: ${execution.error}` : '');
		const part = textPart(fallbackText);
		if (part) content.push(part);
	}

	return content;
}

export function executionToMessagesDto(execution: ExecutionTranscript): AgentPersistedMessageDto[] {
	const messages: AgentPersistedMessageDto[] = [];

	const userMessage = textMessageDto(`${execution.id}:user`, 'user', execution.userMessage);
	if (userMessage) messages.push(userMessage);

	const assistantContent = assistantContentFromExecution(execution);
	if (assistantContent.length > 0) {
		messages.push({
			id: `${execution.id}:assistant`,
			role: 'assistant',
			content: assistantContent,
		});
	}

	return messages;
}

export function executionsToMessagesDto(
	executions: ExecutionTranscript[],
): AgentPersistedMessageDto[] {
	const messages = executions.flatMap(executionToMessagesDto);
	const firstToolCallById = new Map<
		string,
		{ message: AgentPersistedMessageDto; partIndex: number }
	>();
	const duplicatePartIndexesByMessage = new Map<AgentPersistedMessageDto, Set<number>>();

	for (const message of messages) {
		for (const [partIndex, part] of message.content.entries()) {
			if (!isToolCallWithId(part)) continue;
			const first = firstToolCallById.get(part.toolCallId);
			if (!first) {
				firstToolCallById.set(part.toolCallId, { message, partIndex });
				continue;
			}

			const firstPart = first.message.content[first.partIndex];
			if (!isToolCallWithId(firstPart)) continue;

			if (isTerminalToolCallPart(part)) {
				first.message.content[first.partIndex] = mergeTerminalToolCallPart(firstPart, part);
				const indexes = duplicatePartIndexesByMessage.get(message) ?? new Set<number>();
				indexes.add(partIndex);
				duplicatePartIndexesByMessage.set(message, indexes);
			} else if (isTerminalToolCallPart(firstPart)) {
				const indexes = duplicatePartIndexesByMessage.get(message) ?? new Set<number>();
				indexes.add(partIndex);
				duplicatePartIndexesByMessage.set(message, indexes);
			}
		}
	}

	for (const [message, duplicateIndexes] of duplicatePartIndexesByMessage) {
		message.content = message.content.filter((_, index) => !duplicateIndexes.has(index));
	}

	return messages.filter((message) => message.content.length > 0);
}
