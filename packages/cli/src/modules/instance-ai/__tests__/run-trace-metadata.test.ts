import type { InstanceAiEvent } from '@n8n/api-types';

import { buildInstanceAiRunTraceMetadata } from '../run-trace-metadata';

const baseEvent = {
	runId: 'run-1',
	agentId: 'agent-1',
};

describe('buildInstanceAiRunTraceMetadata', () => {
	it('classifies a tool call followed by HITL as a contextless HITL first state', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				...baseEvent,
				payload: { messageId: 'message-1' },
			},
			{
				type: 'tool-call',
				...baseEvent,
				payload: { toolCallId: 'tool-1', toolName: 'credentials', args: { action: 'list' } },
			},
			{
				type: 'confirmation-request',
				...baseEvent,
				payload: {
					requestId: 'request-1',
					toolCallId: 'tool-1',
					toolName: 'credentials',
					args: {},
					severity: 'info',
					message: 'Pick a credential',
				},
			},
		];

		expect(buildInstanceAiRunTraceMetadata(events, { status: 'cancelled' })).toMatchObject({
			first_visible_state: 'contextless_hitl',
			first_tool_name: 'credentials',
			cancellation_type: 'explicit',
		});
	});

	it('keeps the first tool name when assistant text appears first', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'text-delta',
				...baseEvent,
				payload: { text: 'I will check the workflow first.' },
			},
			{
				type: 'tool-call',
				...baseEvent,
				payload: { toolCallId: 'tool-1', toolName: 'workflows', args: { action: 'get' } },
			},
		];

		expect(buildInstanceAiRunTraceMetadata(events, { status: 'completed' })).toEqual({
			first_visible_state: 'assistant_text',
			first_tool_name: 'workflows',
		});
	});

	it('records timeout cancellation type and idle tail without extra fields', () => {
		const metadata = buildInstanceAiRunTraceMetadata([], {
			status: 'cancelled',
			cancellationReason: 'timeout',
			runTimeout: {
				timedOut: true,
				details: {
					reason: 'idle_timeout',
					surface: 'active-run',
					timeoutMs: 600_000,
					elapsedMs: 650_200,
					idleMs: 606_400.4,
				},
			},
		});

		expect(metadata).toEqual({
			first_visible_state: 'empty',
			cancellation_type: 'idle_timeout',
			idle_tail_ms: 606_400,
		});
	});
});
