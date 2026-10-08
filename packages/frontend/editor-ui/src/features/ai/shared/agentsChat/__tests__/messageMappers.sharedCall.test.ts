import { describe, expect, it } from 'vitest';
import { ASSISTANT_CONFIRMATION_TOOL_NAME } from '../assistantConfirmation';
import { TOOL_CALL_STATE } from '../constants';
import { rebuildInteractiveFromHistory } from '../messageMappers';

const approvalPayload = { requestId: 'req-1', message: 'Run "Digest" now?', severity: 'info' };

describe('rebuildInteractiveFromHistory — the tool call behind an Assistant card', () => {
	it('keeps the raw tool name, input and suspend payload, which the shared-chat rules read', () => {
		const input = { action: 'run', workflowId: 'wf-1' };
		const interactive = rebuildInteractiveFromHistory({
			tool: 'executions',
			toolCallId: 'tc-1',
			state: TOOL_CALL_STATE.SUSPENDED,
			input,
			suspendPayload: approvalPayload,
		});

		expect(interactive?.toolName).toBe(ASSISTANT_CONFIRMATION_TOOL_NAME);
		expect(interactive).toMatchObject({
			call: { toolName: 'executions', input, suspendPayload: approvalPayload },
		});
	});

	it('does not mix the parsed card fields into the raw suspend payload', () => {
		const interactive = rebuildInteractiveFromHistory({
			tool: 'executions',
			toolCallId: 'tc-1',
			state: TOOL_CALL_STATE.SUSPENDED,
			input: { action: 'run', workflowId: 'wf-1' },
			suspendPayload: approvalPayload,
		});

		// The parsed card gets `toolName` and `args` for "Always allow"; the raw payload must not.
		expect(interactive?.input).toMatchObject({ toolName: 'executions' });
		expect(
			interactive?.toolName === ASSISTANT_CONFIRMATION_TOOL_NAME &&
				interactive.call?.suspendPayload,
		).toStrictEqual(approvalPayload);
	});
});
