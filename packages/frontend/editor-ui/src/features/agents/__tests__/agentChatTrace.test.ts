import type { AgentSseEvent } from '@n8n/api-types';

import { collapseAgentDeltaEvents, createAgentChatTraceRecorder } from '../agentChatTrace';

function entry(event: AgentSseEvent, receivedAt = '2026-10-29T10:00:00.000Z') {
	return { receivedAt, event };
}

describe('collapseAgentDeltaEvents', () => {
	it('joins a run of deltas for the same part into the first delta', () => {
		const collapsed = collapseAgentDeltaEvents([
			entry({ type: 'text-start', id: 't1' }),
			entry({ type: 'text-delta', id: 't1', delta: 'Hel' }, '2026-10-29T10:00:01.000Z'),
			entry({ type: 'text-delta', id: 't1', delta: 'lo' }, '2026-10-29T10:00:02.000Z'),
			entry({ type: 'text-end', id: 't1' }),
		]);

		expect(collapsed.map(({ event }) => event)).toEqual([
			{ type: 'text-start', id: 't1' },
			{ type: 'text-delta', id: 't1', delta: 'Hello' },
			{ type: 'text-end', id: 't1' },
		]);
		expect(collapsed[1].receivedAt).toBe('2026-10-29T10:00:01.000Z');
	});

	it('keeps deltas of different parts apart', () => {
		const collapsed = collapseAgentDeltaEvents([
			entry({ type: 'reasoning-delta', id: 'r1', delta: 'Think' }),
			entry({ type: 'text-delta', id: 'r1', delta: 'Say' }),
			entry({ type: 'tool-input-delta', toolCallId: 'c1', delta: '{"a"' }),
			entry({ type: 'tool-input-delta', toolCallId: 'c1', delta: ':1}' }),
			entry({ type: 'tool-input-delta', toolCallId: 'c2', delta: '{}' }),
		]);

		expect(collapsed.map(({ event }) => event)).toEqual([
			{ type: 'reasoning-delta', id: 'r1', delta: 'Think' },
			{ type: 'text-delta', id: 'r1', delta: 'Say' },
			{ type: 'tool-input-delta', toolCallId: 'c1', delta: '{"a":1}' },
			{ type: 'tool-input-delta', toolCallId: 'c2', delta: '{}' },
		]);
	});

	it('does not change the recorded events', () => {
		const events = [
			entry({ type: 'text-delta', id: 't1', delta: 'a' }),
			entry({ type: 'text-delta', id: 't1', delta: 'b' }),
		];

		collapseAgentDeltaEvents(events);

		expect(events[0].event).toEqual({ type: 'text-delta', id: 't1', delta: 'a' });
	});
});

describe('createAgentChatTraceRecorder', () => {
	it('gives the recorded events, the last history and the shown messages', () => {
		const recorder = createAgentChatTraceRecorder();
		recorder.recordHistory({ messages: [], openSuspensions: [], activeExecutionId: 'old' });
		recorder.recordHistory({ messages: [], openSuspensions: [], activeExecutionId: null });
		recorder.recordEvent({ type: 'text-delta', id: 't1', delta: 'Hi' });
		recorder.recordEvent({ type: 'text-delta', id: 't1', delta: '!' });
		recorder.recordEvent({ type: 'finish', finishReason: 'stop' });

		const trace = recorder.snapshot({
			threadId: 'thread-1',
			agentId: 'assistant',
			messages: [{ id: 'u1', role: 'user', content: 'Hello' }],
		});

		expect(trace).toMatchObject({
			threadId: 'thread-1',
			agentId: 'assistant',
			messages: [{ id: 'u1', role: 'user', content: 'Hello' }],
			history: { messages: [], openSuspensions: [], activeExecutionId: null },
			events: [
				{ event: { type: 'text-delta', id: 't1', delta: 'Hi!' } },
				{ event: { type: 'finish', finishReason: 'stop' } },
			],
		});
		expect(trace.history?.fetchedAt).toEqual(expect.any(String));
		expect(trace.exportedAt).toEqual(expect.any(String));
	});

	it('has no history before the chat loads one', () => {
		const trace = createAgentChatTraceRecorder().snapshot({
			threadId: 'thread-1',
			agentId: 'assistant',
			messages: [],
		});

		expect(trace.history).toBeNull();
		expect(trace.events).toEqual([]);
	});
});
