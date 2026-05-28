import type { AgentPersistedMessageContentPart, AgentPersistedMessageDto } from '@n8n/api-types';

import type { AgentExecution } from '../entities/agent-execution.entity';
import type { RecordedToolCall, TimelineEvent } from '../execution-recorder';

type ExecutionTranscript = Pick<
	AgentExecution,
	'id' | 'userMessage' | 'assistantResponse' | 'toolCalls' | 'timeline' | 'error'
>;

type ToolCallTimelineEvent = Extract<TimelineEvent, { type: 'tool-call' }>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

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
	return executions.flatMap(executionToMessagesDto);
}
