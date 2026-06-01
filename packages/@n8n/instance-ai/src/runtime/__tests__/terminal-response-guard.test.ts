import type { InstanceAiEvent } from '@n8n/api-types';

import { InstanceAiTerminalResponseGuard } from '../terminal-response-guard';

const runId = 'run-1';
const rootAgentId = 'agent-root';
const guard = () => new InstanceAiTerminalResponseGuard({ runId, rootAgentId });

function runStart(): InstanceAiEvent {
	return {
		type: 'run-start',
		runId,
		agentId: rootAgentId,
		payload: { messageId: 'msg-1', messageGroupId: 'mg-1' },
	};
}

function rootText(text = 'hello'): InstanceAiEvent {
	return {
		type: 'text-delta',
		runId,
		agentId: rootAgentId,
		payload: { text },
	};
}

function rootError(content = 'failed'): InstanceAiEvent {
	return {
		type: 'error',
		runId,
		agentId: rootAgentId,
		payload: { content },
	};
}

function childText(): InstanceAiEvent {
	return {
		type: 'text-delta',
		runId,
		agentId: 'child-agent',
		payload: { text: 'visible child output' },
	};
}

function confirmation(
	overrides: Partial<Extract<InstanceAiEvent, { type: 'confirmation-request' }>['payload']> = {},
): Extract<InstanceAiEvent, { type: 'confirmation-request' }> {
	return {
		type: 'confirmation-request',
		runId,
		agentId: rootAgentId,
		payload: {
			requestId: 'req-1',
			toolCallId: 'tc-1',
			toolName: 'pause-for-user',
			args: {},
			severity: 'info',
			message: 'Please confirm',
			...overrides,
		},
	};
}

describe('InstanceAiTerminalResponseGuard', () => {
	it('does not emit fallback when a completed run already has root text', () => {
		const decision = guard().evaluateTerminal([runStart(), rootText()], 'completed');

		expect(decision.action).toBe('none');
		expect(decision.visibilitySource).toBe('root-text');
	});

	it('emits text fallback for silent completed runs with structured work counts only', () => {
		const decision = guard().evaluateTerminal([runStart()], 'completed', {
			workSummary: { totalToolCalls: 3, totalToolErrors: 1, toolCalls: [] },
		});

		expect(decision.action).toBe('emit');
		expect(decision.event?.type).toBe('text-delta');
		expect(decision.event?.payload).toEqual({
			text: 'I finished the run, but I did not generate a final response. I ran 3 tools; 1 tool errored.',
		});
	});

	it('emits sanitized error when partial root text is followed by failure', () => {
		const decision = guard().evaluateTerminal([runStart(), rootText('partial')], 'errored', {
			errorMessage: 'Safe error',
		});

		expect(decision.action).toBe('emit');
		expect(decision.reason).toBe('errored-after-text');
		expect(decision.event).toMatchObject({
			type: 'error',
			payload: { content: 'Safe error' },
		});
	});

	it('does not emit cancellation fallback when partial root text exists', () => {
		const decision = guard().evaluateTerminal([runStart(), rootText('partial')], 'cancelled');

		expect(decision.action).toBe('none');
		expect(decision.visibilitySource).toBe('root-text');
	});

	it('logs root error then completed as already visible', () => {
		const decision = guard().evaluateTerminal([runStart(), rootError()], 'completed');

		expect(decision.action).toBe('none');
		expect(decision.reason).toBe('completed-after-error');
	});

	it('does not count sub-agent text as root visibility', () => {
		const decision = guard().evaluateTerminal([runStart(), childText()], 'completed');

		expect(decision.action).toBe('emit');
		expect(decision.reason).toBe('completed-silent');
	});

	it('does not emit duplicate fallback for the same run', () => {
		const first = guard().evaluateTerminal([runStart()], 'completed');
		const second = guard().evaluateTerminal([runStart(), first.event!], 'completed');

		expect(first.action).toBe('emit');
		expect(second.action).toBe('none');
		expect(second.reason).toBe('already-emitted');
	});

	it('does not let a prior retry fallback hide the current silent run', () => {
		const decision = guard().evaluateTerminal(
			[
				runStart(),
				{
					type: 'error',
					runId: 'run-previous',
					agentId: 'agent-001',
					responseId: 'terminal-fallback:run-previous:errored',
					payload: { content: 'Previous attempt failed.' },
				},
			],
			'errored',
		);

		expect(decision.action).toBe('emit');
		expect(decision.reason).toBe('errored-silent');
	});

	it('does not let a prior retry fallback hide a malformed confirmation payload', () => {
		const decision = guard().evaluateWaiting(
			[
				runStart(),
				{
					type: 'error',
					runId: 'run-previous',
					agentId: rootAgentId,
					responseId: 'terminal-fallback:run-previous:errored',
					payload: { content: 'Previous attempt failed.' },
				},
			],
			confirmation({ inputType: 'plan-review', message: 'message-only plan' }),
		);

		expect(decision.action).toBe('emit');
		expect(decision.reason).toBe('confirmation-invalid');
	});

	it('treats displayable confirmation UI as visible waiting output', () => {
		const decision = guard().evaluateWaiting([runStart()], confirmation());

		expect(decision.action).toBe('none');
		expect(decision.visibilitySource).toBe('confirmation-ui');
	});

	it('emits deterministic error for malformed confirmation payloads', () => {
		const decision = guard().evaluateWaiting(
			[runStart()],
			confirmation({ inputType: 'plan-review', message: 'message-only plan' }),
		);

		expect(decision.action).toBe('emit');
		expect(decision.reason).toBe('confirmation-invalid');
		expect(decision.event?.type).toBe('error');
	});

	it('does not let prior root text hide a malformed confirmation payload', () => {
		const decision = guard().evaluateWaiting(
			[runStart(), rootText()],
			confirmation({ inputType: 'plan-review', message: 'message-only plan' }),
		);

		expect(decision.action).toBe('emit');
		expect(decision.reason).toBe('confirmation-invalid');
		expect(decision.event?.type).toBe('error');
	});

	it('does not let prior root errors hide a malformed confirmation payload', () => {
		const decision = guard().evaluateWaiting(
			[runStart(), rootError()],
			confirmation({ inputType: 'plan-review', message: 'message-only plan' }),
		);

		expect(decision.action).toBe('emit');
		expect(decision.reason).toBe('confirmation-invalid');
		expect(decision.event?.type).toBe('error');
	});

	it('does not emit fallback when prior root text precedes a valid confirmation', () => {
		const decision = guard().evaluateWaiting([runStart(), rootText()], confirmation());

		expect(decision.action).toBe('none');
		expect(decision.reason).toBe('already-visible');
	});
});
