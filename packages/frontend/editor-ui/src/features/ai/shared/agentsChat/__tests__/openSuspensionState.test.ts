import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '../constants';
import {
	isSettledToolCall,
	openSuspensionOf,
	reconcileMessageStatus,
	settleUnfinishedToolCall,
} from '../openSuspensionState';
import type { ChatMessage, ToolCall } from '../types';

const toolCall = (state: ToolCall['state'], extra: Partial<ToolCall> = {}): ToolCall => ({
	tool: 'executions',
	toolCallId: 'toolu_1',
	state,
	...extra,
});

const message = (status: ChatMessage['status'], toolCalls: ToolCall[] = []): ChatMessage => ({
	id: 'm1',
	role: 'assistant',
	content: '',
	toolCalls,
	status,
});

describe('openSuspensionOf', () => {
	it('gives the open suspension of its id to a call that is not cancelled, and none to a cancelled call', () => {
		fc.assert(
			fc.property(
				fc.string(),
				fc.option(fc.boolean(), { nil: undefined }),
				fc.boolean(),
				(toolCallId, cancelled, isOpen) => {
					const suspension = { toolCallId, runId: 'run-1' };
					const byId = new Map(isOpen ? [[toolCallId, suspension]] : []);

					const found = openSuspensionOf({ toolCallId, cancelled }, byId);

					expect(found).toBe(isOpen && cancelled !== true ? suspension : undefined);
				},
			),
		);
	});
});

describe('isSettledToolCall', () => {
	it('is true for a done, failed or cancelled call only', () => {
		const settled = Object.values(TOOL_CALL_STATE).filter((state) =>
			isSettledToolCall(toolCall(state)),
		);

		expect(settled.sort()).toEqual(
			[TOOL_CALL_STATE.CANCELLED, TOOL_CALL_STATE.DONE, TOOL_CALL_STATE.ERROR].sort(),
		);
	});
});

describe('settleUnfinishedToolCall', () => {
	it('marks the call as failed when its run failed', () => {
		const call = toolCall(TOOL_CALL_STATE.RUNNING, { canceled: true });
		settleUnfinishedToolCall(message(CHAT_MESSAGE_STATUS.ERROR), call);
		expect(call.state).toBe(TOOL_CALL_STATE.ERROR);
	});

	it('marks the call as cancelled when its run ended', () => {
		const call = toolCall(TOOL_CALL_STATE.SUSPENDED);
		settleUnfinishedToolCall(message(CHAT_MESSAGE_STATUS.AWAITING_USER), call);
		expect(call).toMatchObject({ state: TOOL_CALL_STATE.CANCELLED, canceled: true });
	});

	it('leaves a call of a streaming run as it is', () => {
		const call = toolCall(TOOL_CALL_STATE.RUNNING);
		settleUnfinishedToolCall(message(CHAT_MESSAGE_STATUS.STREAMING), call);
		expect(call.state).toBe(TOOL_CALL_STATE.RUNNING);
		expect(call.canceled).toBeUndefined();
	});

	it('marks a call that the server cancelled as cancelled, also in a streaming run', () => {
		const call = toolCall(TOOL_CALL_STATE.RUNNING, { canceled: true });
		settleUnfinishedToolCall(message(CHAT_MESSAGE_STATUS.STREAMING), call);
		expect(call.state).toBe(TOOL_CALL_STATE.CANCELLED);
	});
});

describe('reconcileMessageStatus', () => {
	it('waits for the user while a call of the message is open', () => {
		const msg = message(CHAT_MESSAGE_STATUS.SUCCESS);
		reconcileMessageStatus(msg, true);
		expect(msg.status).toBe(CHAT_MESSAGE_STATUS.AWAITING_USER);
	});

	it('ends a message that waited with no open call, as failed when a call failed', () => {
		const failed = message(CHAT_MESSAGE_STATUS.AWAITING_USER, [
			toolCall(TOOL_CALL_STATE.CANCELLED),
			toolCall(TOOL_CALL_STATE.ERROR),
		]);
		const ended = message(CHAT_MESSAGE_STATUS.AWAITING_USER, [toolCall(TOOL_CALL_STATE.CANCELLED)]);

		reconcileMessageStatus(failed, false);
		reconcileMessageStatus(ended, false);

		expect(failed.status).toBe(CHAT_MESSAGE_STATUS.ERROR);
		expect(ended.status).toBe(CHAT_MESSAGE_STATUS.SUCCESS);
	});

	it('keeps the status of a message that did not wait', () => {
		const msg = message(CHAT_MESSAGE_STATUS.STREAMING);
		reconcileMessageStatus(msg, false);
		expect(msg.status).toBe(CHAT_MESSAGE_STATUS.STREAMING);
	});
});
