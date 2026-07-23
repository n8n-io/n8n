import { describe, it, expect, vi } from 'vitest';

import type { StreamChunk } from '../../../types';
import { AgentEventBus } from '../../state/event-bus';
import { startStreamSession } from '../stream-session';

async function drain(stream: ReadableStream<StreamChunk>): Promise<StreamChunk[]> {
	const reader = stream.getReader();
	const chunks: StreamChunk[] = [];
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	return chunks;
}

describe('startStreamSession', () => {
	it('completes shutdown even when the abort persistence throws', async () => {
		const bus = new AgentEventBus();
		const abortScope = bus.createAbortScope();
		abortScope.abort(); // simulate a stopped run

		const cleanupRun = vi.fn().mockResolvedValue(undefined);
		const flushTelemetry = vi.fn().mockResolvedValue(undefined);

		const readable = startStreamSession({
			eventBus: bus,
			abortScope,
			runId: 'run-1',
			options: undefined,
			withRootSpan: async <T>(_op: unknown, _opts: unknown, _rid: unknown, fn: () => Promise<T>) =>
				await fn(),
			runLoop: async () => {
				await Promise.resolve();
				throw new Error('Agent run was aborted');
			},
			flushTelemetry,
			cleanupRun,
			updateState: vi.fn(),
			emitError: vi.fn(),
			getAbortFinish: () => ({}),
			// Best-effort persist that fails: it must not skip the shutdown steps.
			persistTurnOnAbort: async () => {
				await Promise.resolve();
				throw new Error('persist boom');
			},
		});

		const chunks = await drain(readable);

		expect(cleanupRun).toHaveBeenCalledTimes(1);
		expect(flushTelemetry).toHaveBeenCalledTimes(1);
		// guard.fail still ran, so the consumer receives a terminal finish chunk.
		expect(chunks.some((c) => c.type === 'finish')).toBe(true);
	});
});
