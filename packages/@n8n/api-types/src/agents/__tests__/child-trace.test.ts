import { describe, expect, it, vi } from 'vitest';

import { applyForwardedChildChunk, emptyChildTrace, settleChildTrace } from '../child-trace';

describe('applyForwardedChildChunk', () => {
	it('accumulates text, reasoning and tool steps from a realistic chunk sequence', () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000);
		const trace = emptyChildTrace();

		applyForwardedChildChunk(trace, { type: 'text-delta', id: 't-1', delta: 'Hello ' });
		applyForwardedChildChunk(trace, { type: 'text-delta', id: 't-1', delta: 'world' });
		applyForwardedChildChunk(trace, { type: 'reasoning-delta', id: 'r-1', delta: 'Think ' });
		applyForwardedChildChunk(trace, { type: 'reasoning-delta', id: 'r-1', delta: 'hard' });
		applyForwardedChildChunk(trace, { type: 'reasoning-end', id: 'r-1' });
		applyForwardedChildChunk(trace, {
			type: 'tool-input-start',
			toolCallId: 'child-tc-1',
			toolName: 'web_search',
		});
		applyForwardedChildChunk(trace, {
			type: 'tool-execution-end',
			toolCallId: 'child-tc-1',
			toolName: 'web_search',
			isError: false,
			endTime: 2_000,
		});

		expect(trace.text).toBe('Hello world');
		expect(trace.reasoningSegments).toHaveLength(1);
		expect(trace.reasoningSegments[0]).toMatchObject({
			id: 'r-1',
			content: 'Think hard',
			endTime: 1_000,
		});
		expect(trace.steps).toEqual([
			{ toolCallId: 'child-tc-1', toolName: 'web_search', running: false },
		]);
		vi.useRealTimers();
	});

	it('records no segment for reasoning that never emits a delta', () => {
		const trace = emptyChildTrace();

		applyForwardedChildChunk(trace, { type: 'reasoning-start', id: 'r-1' });
		applyForwardedChildChunk(trace, { type: 'reasoning-end', id: 'r-1' });

		expect(trace.reasoningSegments).toEqual([]);
	});
});

describe('settleChildTrace', () => {
	it('clears residual running flags on every step', () => {
		const trace = emptyChildTrace();
		trace.steps.push(
			{ toolCallId: 'a', toolName: 'one', running: true },
			{ toolCallId: 'b', toolName: 'two', running: true },
		);

		settleChildTrace(trace);

		expect(trace.steps.every((step) => !step.running)).toBe(true);
	});
});
