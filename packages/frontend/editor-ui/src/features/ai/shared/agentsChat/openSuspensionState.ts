import type { AgentBuilderOpenSuspension } from '@n8n/api-types';

import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from './constants';
import type { ChatMessage, ToolCall } from './types';

/** The state rules that reconcile a loaded history with the suspensions that are still open. */

export type OpenSuspensionsById = ReadonlyMap<string, AgentBuilderOpenSuspension>;

const SETTLED_TOOL_CALL_STATES: ReadonlySet<ToolCall['state']> = new Set([
	TOOL_CALL_STATE.DONE,
	TOOL_CALL_STATE.ERROR,
	TOOL_CALL_STATE.CANCELLED,
]);

export function isSettledToolCall(toolCall: ToolCall): boolean {
	return SETTLED_TOOL_CALL_STATES.has(toolCall.state);
}

/**
 * The open suspension of a call. A model can use a tool call id again, so the server marks an
 * earlier call with the id of the open call as cancelled. Such a call is never the open call.
 */
export function openSuspensionOf(
	call: { toolCallId: string; cancelled?: boolean },
	byToolCallId: OpenSuspensionsById,
): AgentBuilderOpenSuspension | undefined {
	return call.cancelled === true ? undefined : byToolCallId.get(call.toolCallId);
}

/** A call that no open suspension waits for ended with its run. */
export function settleUnfinishedToolCall(msg: ChatMessage, toolCall: ToolCall): void {
	if (msg.status === CHAT_MESSAGE_STATUS.ERROR) {
		toolCall.state = TOOL_CALL_STATE.ERROR;
	} else if (msg.status !== CHAT_MESSAGE_STATUS.STREAMING || toolCall.canceled === true) {
		toolCall.state = TOOL_CALL_STATE.CANCELLED;
		toolCall.canceled = true;
	}
}

export function reconcileMessageStatus(msg: ChatMessage, hasOpenToolCall: boolean): void {
	if (hasOpenToolCall) {
		msg.status = CHAT_MESSAGE_STATUS.AWAITING_USER;
	} else if (msg.status === CHAT_MESSAGE_STATUS.AWAITING_USER) {
		msg.status = msg.toolCalls?.some((tc) => tc.state === TOOL_CALL_STATE.ERROR)
			? CHAT_MESSAGE_STATUS.ERROR
			: CHAT_MESSAGE_STATUS.SUCCESS;
	}
}
