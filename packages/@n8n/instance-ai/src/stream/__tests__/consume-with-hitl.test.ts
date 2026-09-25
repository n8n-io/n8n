import type { InstanceAiEventBus } from '../../event-bus/event-bus.interface';
import { consumeStreamCascading } from '../consume-with-hitl';

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
	};
}

function createLogger() {
	return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

describe('consumeStreamCascading', () => {
	const finishChunk = {
		type: 'finish',
		model: 'anthropic/claude-sonnet',
		usage: {
			promptTokens: 100,
			completionTokens: 20,
			totalTokens: 120,
			inputTokenDetails: { noCache: 80, cacheRead: 20, cacheWrite: 0 },
		},
	};
	const expectedUsageItem = {
		type: 'llmTokens',
		model: 'anthropic/claude-sonnet',
		uncachedInput: 80,
		cacheRead: 20,
		cacheWrite: 0,
		output: 20,
	};

	it('returns usage populated from a finish chunk on a completed stream', async () => {
		const result = await consumeStreamCascading({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([finishChunk]),
				text: Promise.resolve('done'),
			},
			runId: 'run-1',
			agentId: 'agent-1',
			eventBus: createEventBus(),
			logger: createLogger(),
			threadId: 'thread-1',
			abortSignal: new AbortController().signal,
		});

		expect(result.status).toBe('completed');
		expect(result.usage?.usage).toEqual([expectedUsageItem]);
	});

	it('returns usage on a suspended result too', async () => {
		const result = await consumeStreamCascading({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([
					finishChunk,
					{
						type: 'tool-call-suspended',
						runId: 'agent-run-1',
						toolCallId: 'tool-call-1',
						toolName: 'ask_questions',
						suspendPayload: { requestId: 'req-1' },
					},
				]),
				text: Promise.resolve(''),
			},
			runId: 'run-1',
			agentId: 'agent-1',
			eventBus: createEventBus(),
			logger: createLogger(),
			threadId: 'thread-1',
			abortSignal: new AbortController().signal,
		});

		expect(result.status).toBe('suspended');
		expect(result.usage?.usage).toEqual([expectedUsageItem]);
	});

	it('leaves usage undefined when the stream has no finish chunk', async () => {
		const result = await consumeStreamCascading({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([{ type: 'text-delta', delta: 'hi' }]),
				text: Promise.resolve('hi'),
			},
			runId: 'run-1',
			agentId: 'agent-1',
			eventBus: createEventBus(),
			logger: createLogger(),
			threadId: 'thread-1',
			abortSignal: new AbortController().signal,
		});

		expect(result.usage).toBeUndefined();
	});
});
