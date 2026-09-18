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

	it('reads assistant text from a coalesced block, as the durable log persists it', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'text-block',
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

	it('ignores a whitespace-only block, same as a whitespace-only delta', () => {
		const events: InstanceAiEvent[] = [
			{ type: 'text-block', ...baseEvent, payload: { text: '  \n ' } },
			{
				type: 'tool-call',
				...baseEvent,
				payload: { toolCallId: 'tool-1', toolName: 'workflows', args: { action: 'get' } },
			},
		];

		expect(buildInstanceAiRunTraceMetadata(events, { status: 'completed' })).toEqual({
			first_visible_state: 'tool_call',
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
	it('marks a run the user steered and records the step it stopped at', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'user-message',
				...baseEvent,
				payload: { messageId: 'qm-1', text: 'use Slack instead', source: 'steered' },
			},
			{
				type: 'user-message',
				...baseEvent,
				payload: { messageId: 'qm-2', text: 'and again', source: 'steered' },
			},
		];

		const metadata = buildInstanceAiRunTraceMetadata(events, {
			status: 'completed',
			steeredAtStep: 4,
		});

		expect(metadata).toEqual({
			first_visible_state: 'empty',
			steered: true,
			steer_count: 2,
			steered_at_step: 4,
		});
	});

	it('marks a run the boundary stopped even when no announcement landed on it', () => {
		const metadata = buildInstanceAiRunTraceMetadata([], { status: 'completed', steeredAtStep: 1 });

		expect(metadata).toEqual({
			first_visible_state: 'empty',
			steered: true,
			steered_at_step: 1,
		});
	});

	it('counts an announced turn without marking a run no boundary stopped', () => {
		// Send now, then Stop before the next tool call: announced, not steered.
		const events: InstanceAiEvent[] = [
			{
				type: 'user-message',
				...baseEvent,
				payload: { messageId: 'qm-1', text: 'use Slack instead', source: 'steered' },
			},
		];

		const metadata = buildInstanceAiRunTraceMetadata(events, { status: 'cancelled' });

		expect(metadata).toEqual({
			first_visible_state: 'empty',
			steer_count: 1,
			cancellation_type: 'explicit',
		});
	});

	it('does not mark a run when only a flushed queued message was delivered', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'user-message',
				...baseEvent,
				payload: { messageId: 'qm-1', text: 'next turn', source: 'queued' },
			},
		];

		const metadata = buildInstanceAiRunTraceMetadata(events, { status: 'completed' });

		expect(metadata).toEqual({ first_visible_state: 'empty' });
	});
});
