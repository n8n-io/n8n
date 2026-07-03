import type { InstanceAiEventBus } from '../../event-bus/event-bus.interface';
import { consumeStreamWithHitl, requireCompletedHitlText } from '../consume-with-hitl';

async function* fromChunks(chunks: unknown[]) {
	for (const chunk of chunks) {
		await Promise.resolve();
		yield chunk;
	}
}

function createEventBus(): InstanceAiEventBus {
	return {
		publish: vi.fn(),
		subscribe: vi.fn().mockReturnValue(() => {}),
		getEventsAfter: vi.fn(),
		getNextEventId: vi.fn(),
		getEventsForRun: vi.fn().mockReturnValue([]),
		getEventsForRuns: vi.fn().mockReturnValue([]),
	};
}

function createLogger() {
	return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

describe('consumeStreamWithHitl', () => {
	it('preserves errored status from the resumable stream executor', async () => {
		const result = await consumeStreamWithHitl({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([{ type: 'error', error: new Error('boom') }]),
				text: Promise.resolve('partial'),
			},
			runId: 'run-1',
			agentId: 'agent-1',
			eventBus: createEventBus(),
			logger: createLogger(),
			threadId: 'thread-1',
			abortSignal: new AbortController().signal,
			waitForConfirmation: vi.fn(),
		});

		expect(result.status).toBe('errored');
		expect(result.agentRunId).toBe('agent-run-1');
		await expect(requireCompletedHitlText(result, 'Test sub-agent')).rejects.toThrow(
			'Test sub-agent failed while streaming',
		);
	});

	it('returns completed text when the stream completed', async () => {
		const result = await consumeStreamWithHitl({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([{ type: 'text-delta', delta: 'done' }]),
				text: Promise.resolve('done'),
			},
			runId: 'run-1',
			agentId: 'agent-1',
			eventBus: createEventBus(),
			logger: createLogger(),
			threadId: 'thread-1',
			abortSignal: new AbortController().signal,
			waitForConfirmation: vi.fn(),
		});

		await expect(requireCompletedHitlText(result, 'Test sub-agent')).resolves.toBe('done');
	});

	it('surfaces accumulated token usage from finish chunks', async () => {
		const result = await consumeStreamWithHitl({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([
					{
						type: 'finish',
						model: 'anthropic/claude-haiku-4-5',
						usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.02 },
					},
				]),
				text: Promise.resolve('done'),
			},
			runId: 'run-1',
			agentId: 'agent-1',
			eventBus: createEventBus(),
			logger: createLogger(),
			threadId: 'thread-1',
			abortSignal: new AbortController().signal,
			waitForConfirmation: vi.fn(),
		});

		expect(result.usage).toMatchObject({
			promptTokens: 10,
			completionTokens: 5,
			totalTokens: 15,
			costUsd: 0.02,
		});
	});

	it('omits usage when the stream emitted no finish chunk', async () => {
		const result = await consumeStreamWithHitl({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([{ type: 'text-delta', delta: 'done' }]),
				text: Promise.resolve('done'),
			},
			runId: 'run-1',
			agentId: 'agent-1',
			eventBus: createEventBus(),
			logger: createLogger(),
			threadId: 'thread-1',
			abortSignal: new AbortController().signal,
			waitForConfirmation: vi.fn(),
		});

		expect(result.usage).toBeUndefined();
	});
});
