import type { AgentSseEvent } from '@n8n/api-types';

import { appendTraceEvent, type AssistantAgentTraceEvent } from '../assistantAgentTrace';

function appendAll(events: AgentSseEvent[], limit?: number): AssistantAgentTraceEvent[] {
	const trace: AssistantAgentTraceEvent[] = [];
	for (const event of events) appendTraceEvent(trace, event, limit);
	return trace;
}

describe('appendTraceEvent', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-29T10:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('joins a run of deltas for the same part into one event with the time of the first', () => {
		const trace: AssistantAgentTraceEvent[] = [];
		appendTraceEvent(trace, { type: 'text-start', id: 't1' });
		appendTraceEvent(trace, { type: 'text-delta', id: 't1', delta: 'Hel' });
		vi.setSystemTime(new Date('2026-10-29T10:00:05.000Z'));
		appendTraceEvent(trace, { type: 'text-delta', id: 't1', delta: 'lo' });
		appendTraceEvent(trace, { type: 'text-end', id: 't1' });

		expect(trace).toEqual([
			{ receivedAt: '2026-10-29T10:00:00.000Z', event: { type: 'text-start', id: 't1' } },
			{
				receivedAt: '2026-10-29T10:00:00.000Z',
				event: { type: 'text-delta', id: 't1', delta: 'Hello' },
			},
			{ receivedAt: '2026-10-29T10:00:05.000Z', event: { type: 'text-end', id: 't1' } },
		]);
	});

	it('keeps deltas of different parts apart', () => {
		const trace = appendAll([
			{ type: 'reasoning-delta', id: 'r1', delta: 'Think' },
			{ type: 'text-delta', id: 'r1', delta: 'Say' },
			{ type: 'tool-input-delta', toolCallId: 'c1', delta: '{"a"' },
			{ type: 'tool-input-delta', toolCallId: 'c1', delta: ':1}' },
			{ type: 'tool-input-delta', toolCallId: 'c2', delta: '{}' },
		]);

		expect(trace.map(({ event }) => event)).toEqual([
			{ type: 'reasoning-delta', id: 'r1', delta: 'Think' },
			{ type: 'text-delta', id: 'r1', delta: 'Say' },
			{ type: 'tool-input-delta', toolCallId: 'c1', delta: '{"a":1}' },
			{ type: 'tool-input-delta', toolCallId: 'c2', delta: '{}' },
		]);
	});

	it('starts a new event when another event comes between deltas of the same part', () => {
		const trace = appendAll([
			{ type: 'text-delta', id: 't1', delta: 'a' },
			{ type: 'start-step' },
			{ type: 'text-delta', id: 't1', delta: 'b' },
		]);

		expect(trace.map(({ event }) => event)).toEqual([
			{ type: 'text-delta', id: 't1', delta: 'a' },
			{ type: 'start-step' },
			{ type: 'text-delta', id: 't1', delta: 'b' },
		]);
	});

	it('drops the oldest events past the limit, and counts joined deltas once', () => {
		const trace = appendAll(
			[
				{ type: 'start-step' },
				{ type: 'text-delta', id: 't1', delta: 'a' },
				{ type: 'text-delta', id: 't1', delta: 'b' },
				{ type: 'text-delta', id: 't1', delta: 'c' },
				{ type: 'finish-step' },
				{ type: 'finish', finishReason: 'stop' },
			],
			3,
		);

		expect(trace.map(({ event }) => event)).toEqual([
			{ type: 'text-delta', id: 't1', delta: 'abc' },
			{ type: 'finish-step' },
			{ type: 'finish', finishReason: 'stop' },
		]);
	});
});
