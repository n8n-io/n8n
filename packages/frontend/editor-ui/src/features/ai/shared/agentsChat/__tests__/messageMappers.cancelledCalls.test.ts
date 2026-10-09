import { describe, expect, it } from 'vitest';
import type { AgentPersistedMessageContentPart, AgentPersistedMessageDto } from '@n8n/api-types';

import { ASSISTANT_CONFIRMATION_TOOL_NAME } from '../assistantConfirmation';
import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '../constants';
import { applyOpenSuspensions, convertDbMessages, getMessageInteractives } from '../messageMappers';

// A model can use a tool call id again in a later turn. The server then marks the earlier call
// that never got its result as cancelled, and only the call that waits may show its card.
const REUSED_ID = 'toolu_1';

const cardPayload = (message: string) => ({
	requestId: `req-${message}`,
	message,
	severity: 'info',
});

const runCall = (workflowId: string, extra: Partial<AgentPersistedMessageContentPart>) => ({
	type: 'tool-call',
	toolName: 'executions',
	toolCallId: REUSED_ID,
	input: { action: 'run', workflowId },
	suspendPayload: cardPayload(`Run ${workflowId}?`),
	...extra,
});

const assistant = (
	id: string,
	part: AgentPersistedMessageContentPart,
	extra: Partial<AgentPersistedMessageDto> = {},
): AgentPersistedMessageDto => ({ id, role: 'assistant', content: [part], ...extra });

const openSuspension = {
	toolCallId: REUSED_ID,
	runId: 'run-open',
	suspendPayload: cardPayload('Run wf-B?'),
};

function load(messages: AgentPersistedMessageDto[]) {
	return applyOpenSuspensions(convertDbMessages(messages), [openSuspension]);
}

describe('applyOpenSuspensions with an earlier call that has the open id', () => {
	it('shows the card of the waiting call only, and the stopped call of the same tool as cancelled', () => {
		const [stopped, open] = load([
			assistant('stopped', runCall('wf-A', { canceled: true })),
			assistant('open', runCall('wf-B', { state: 'pending' })),
		]);

		expect(stopped.toolCalls?.[0]).toMatchObject({
			state: TOOL_CALL_STATE.CANCELLED,
			canceled: true,
		});
		expect(stopped.toolCalls?.[0].runId).toBeUndefined();
		expect(getMessageInteractives(stopped)).toEqual([]);
		expect(stopped.status).toBe(CHAT_MESSAGE_STATUS.SUCCESS);

		expect(open.toolCalls?.[0]).toMatchObject({
			state: TOOL_CALL_STATE.SUSPENDED,
			runId: 'run-open',
			input: { action: 'run', workflowId: 'wf-B' },
		});
		expect(getMessageInteractives(open)).toEqual([
			expect.objectContaining({
				toolName: ASSISTANT_CONFIRMATION_TOOL_NAME,
				toolCallId: REUSED_ID,
				runId: 'run-open',
				input: expect.objectContaining({ message: 'Run wf-B?' }),
			}),
		]);
		expect(open.status).toBe(CHAT_MESSAGE_STATUS.AWAITING_USER);
	});

	it('does not give the open card to a cancelled call of another tool with the open id', () => {
		const interrupted = {
			type: 'tool-call',
			toolName: 'build-workflow',
			toolCallId: REUSED_ID,
			input: { name: 'Digest' },
			canceled: true,
		};

		const [build, open] = load([
			assistant('build', interrupted),
			assistant('open', runCall('wf-B', { state: 'pending' })),
		]);

		expect(build.toolCalls?.[0]).toMatchObject({ state: TOOL_CALL_STATE.CANCELLED });
		expect(build.toolCalls?.[0].suspendPayload).toBeUndefined();
		expect(getMessageInteractives(build)).toEqual([]);
		expect(getMessageInteractives(open)).toHaveLength(1);
	});

	it('keeps the error state of a cancelled call in a run that failed', () => {
		const [failed] = load([
			assistant('failed', runCall('wf-A', { canceled: true }), { executionStatus: 'error' }),
			assistant('open', runCall('wf-B', { state: 'pending' })),
		]);

		expect(failed.toolCalls?.[0]).toMatchObject({ state: TOOL_CALL_STATE.ERROR });
		expect(getMessageInteractives(failed)).toEqual([]);
	});

	it('still re-arms every open call that is not cancelled', () => {
		const [first, second] = load([
			assistant('first', runCall('wf-A', { state: 'pending' })),
			assistant('second', runCall('wf-B', { state: 'pending' })),
		]);

		// Without the server mark, the client cannot tell the calls apart.
		expect(first.toolCalls?.[0]).toMatchObject({ state: TOOL_CALL_STATE.SUSPENDED });
		expect(second.toolCalls?.[0]).toMatchObject({ state: TOOL_CALL_STATE.SUSPENDED });
	});
});
