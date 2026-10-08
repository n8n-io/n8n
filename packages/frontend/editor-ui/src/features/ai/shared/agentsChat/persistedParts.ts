import type { AgentPersistedMessageContentPart } from '@n8n/api-types';

import { TOOL_CALL_STATE, type ToolCallState } from './constants';
import { isFailedDelegateOutput } from './delegateTool';
import { summariseToolCall } from './interactiveSummary';
import type { ChatMessageAttachment, ThinkingSegment, ToolCall } from './types';

/** Converters from one persisted content part to the shapes that the chat renders. */

function toolCallResult(
	part: AgentPersistedMessageContentPart,
	toolName: string,
	failed: boolean,
): { state: ToolCallState; output: unknown } {
	if (part.state === 'resolved') {
		if (part.canceled === true) return { state: TOOL_CALL_STATE.CANCELLED, output: part.output };
		// A failed delegation resolves the call, so its output holds the failure.
		const state = isFailedDelegateOutput(toolName, part.output)
			? TOOL_CALL_STATE.ERROR
			: TOOL_CALL_STATE.DONE;
		return { state, output: part.output };
	}
	if (part.state === 'rejected' || failed) {
		return { state: TOOL_CALL_STATE.ERROR, output: part.error };
	}
	return { state: TOOL_CALL_STATE.RUNNING, output: undefined };
}

/** `failed` is true when the run of the message ended in an error or an interruption. */
export function toolCallFromPersistedPart(
	part: AgentPersistedMessageContentPart,
	toolName: string,
	failed: boolean,
): ToolCall {
	const { state, output } = toolCallResult(part, toolName, failed);
	return {
		tool: toolName,
		toolCallId: part.toolCallId ?? '',
		input: part.input,
		...(output !== undefined && { output }),
		...(part.canceled === true && { canceled: true }),
		state,
		...(part.startTime !== undefined && { startTime: part.startTime }),
		...(part.endTime !== undefined && { endTime: part.endTime }),
		...(part.suspendPayload !== undefined && { suspendPayload: part.suspendPayload }),
		...(part.childTrace && { childProgress: part.childTrace }),
		...(part.approvedBy && { approvedBy: part.approvedBy }),
		...(part.declinedBy && { declinedBy: part.declinedBy }),
		displaySummary: summariseToolCall(toolName, output, part.input),
	};
}

export function attachmentFromPersistedPart(
	part: AgentPersistedMessageContentPart,
	fileId: string,
): ChatMessageAttachment {
	return {
		fileId,
		fileName: part.fileName ?? 'attachment',
		mimeType: part.mimeType ?? 'application/octet-stream',
		sizeBytes: part.sizeBytes,
	};
}

export function reasoningSegmentFromPersistedPart(
	part: AgentPersistedMessageContentPart,
	text: string,
	id: string,
): ThinkingSegment {
	return {
		id,
		content: text,
		...(part.startTime !== undefined && { startTime: part.startTime }),
		...(part.endTime !== undefined && { endTime: part.endTime }),
	};
}
