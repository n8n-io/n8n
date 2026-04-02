import { executeResumableStream } from '../resumable-stream-executor';
import { streamAgentRun } from '../stream-runner';
import { traceWorkingMemoryContext } from '../working-memory-tracing';

jest.mock('../resumable-stream-executor', () => ({
	executeResumableStream: jest.fn(),
	createLlmStepTraceHooks: jest.fn(),
}));

jest.mock('../working-memory-tracing', () => ({
	traceWorkingMemoryContext: jest.fn(
		async (_options: unknown, fn: () => Promise<unknown>) => await fn(),
	),
}));

function createEventBus() {
	return {
		publish: jest.fn(),
		subscribe: jest.fn(),
		getEventsAfter: jest.fn(),
		getNextEventId: jest.fn(),
		getEventsForRun: jest.fn().mockReturnValue([]),
		getEventsForRuns: jest.fn().mockReturnValue([]),
	};
}

async function* fromChunks(chunks: unknown[]) {
	for (const chunk of chunks) {
		await Promise.resolve();
		yield chunk;
	}
}

async function* emptyStream() {
	await Promise.resolve();
	yield* [];
}

describe('streamAgentRun', () => {
	it('returns errored status when agent stream contains an error chunk', async () => {
		jest.mocked(executeResumableStream).mockResolvedValue({
			status: 'errored',
			mastraRunId: 'mastra-run-1',
		});
		const eventBus = createEventBus();
		const agent = {
			stream: jest.fn().mockResolvedValue({
				runId: 'mastra-run-1',
				fullStream: fromChunks([
					{ type: 'text-delta', payload: { text: 'Hello' } },
					{
						type: 'error',
						runId: 'mastra-run-1',
						from: 'AGENT',
						payload: { error: new Error('Not Found') },
					},
				]),
			}),
		};

		const result = await streamAgentRun(
			agent,
			'test input',
			{},
			{
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				signal: new AbortController().signal,
				eventBus,
			},
		);

		expect(result.status).toBe('errored');
		expect(result.mastraRunId).toBe('mastra-run-1');
	});

	it('returns completed status for successful streams', async () => {
		jest.mocked(executeResumableStream).mockResolvedValue({
			status: 'completed',
			mastraRunId: 'mastra-run-1',
		});
		const eventBus = createEventBus();
		const agent = {
			stream: jest.fn().mockResolvedValue({
				runId: 'mastra-run-1',
				fullStream: fromChunks([{ type: 'text-delta', payload: { text: 'All good' } }]),
			}),
		};

		const result = await streamAgentRun(
			agent,
			'test input',
			{},
			{
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				signal: new AbortController().signal,
				eventBus,
			},
		);

		expect(result.status).toBe('completed');
	});

	it('passes through the buffered manual confirmation event', async () => {
		const mockedExecuteResumableStream = jest.mocked(executeResumableStream);
		const agent = {
			stream: jest.fn().mockResolvedValue({
				runId: 'mastra-run-1',
				fullStream: emptyStream(),
			}),
		};
		const eventBus = createEventBus();

		mockedExecuteResumableStream.mockResolvedValue({
			status: 'suspended',
			mastraRunId: 'mastra-run-1',
			suspension: {
				requestId: 'request-1',
				toolCallId: 'tool-call-1',
				toolName: 'pause-for-user',
			},
			confirmationEvent: {
				type: 'confirmation-request',
				runId: 'run-1',
				agentId: 'agent-1',
				payload: {
					requestId: 'request-1',
					toolCallId: 'tool-call-1',
					toolName: 'pause-for-user',
					args: {},
					severity: 'warning',
					message: 'Please confirm',
				},
			},
		});

		const result = await streamAgentRun(
			agent,
			'hello',
			{},
			{
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				signal: new AbortController().signal,
				eventBus,
			},
		);

		expect(result.status).toBe('suspended');
		expect(result.mastraRunId).toBe('mastra-run-1');
		expect(result.suspension?.requestId).toBe('request-1');
		expect(result.confirmationEvent?.type).toBe('confirmation-request');
		expect(result.confirmationEvent?.payload.requestId).toBe('request-1');
		expect(mockedExecuteResumableStream).toHaveBeenCalledWith(
			expect.objectContaining({
				control: { mode: 'manual' },
			}),
		);
	});

	it('passes the full Mastra stream payload through to the resumable executor', async () => {
		const mockedExecuteResumableStream = jest.mocked(executeResumableStream);
		const streamResult = {
			runId: 'mastra-run-2',
			fullStream: emptyStream(),
			text: Promise.resolve('done'),
			steps: Promise.resolve([{ text: 'done' }]),
			response: Promise.resolve({ id: 'response-1' }),
			usage: Promise.resolve({ inputTokens: 1, outputTokens: 2, totalTokens: 3 }),
		};
		const agent = {
			stream: jest.fn().mockResolvedValue(streamResult),
		};
		const eventBus = createEventBus();

		mockedExecuteResumableStream.mockResolvedValue({
			status: 'completed',
			mastraRunId: 'mastra-run-2',
			text: Promise.resolve('done'),
		});

		await streamAgentRun(
			agent,
			'hello',
			{},
			{
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				signal: new AbortController().signal,
				eventBus,
			},
		);

		expect(mockedExecuteResumableStream).toHaveBeenCalledWith(
			expect.objectContaining({
				stream: streamResult,
			}),
		);
	});

	it('wraps memory-enabled stream setup in a working memory context span', async () => {
		const mockedTraceWorkingMemoryContext = jest.mocked(traceWorkingMemoryContext);
		const mockedExecuteResumableStream = jest.mocked(executeResumableStream);
		const streamResult = {
			runId: 'mastra-run-3',
			fullStream: emptyStream(),
			text: Promise.resolve('done'),
		};
		const agent = {
			stream: jest.fn().mockResolvedValue(streamResult),
		};
		const eventBus = createEventBus();

		mockedExecuteResumableStream.mockResolvedValue({
			status: 'completed',
			mastraRunId: 'mastra-run-3',
			text: Promise.resolve('done'),
		});

		await streamAgentRun(
			agent,
			'hello',
			{
				memory: {
					resource: 'user-1',
					thread: 'thread-1',
				},
			},
			{
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				signal: new AbortController().signal,
				eventBus,
			},
		);

		expect(mockedTraceWorkingMemoryContext).toHaveBeenCalledWith(
			expect.objectContaining({
				phase: 'initial',
				agentId: 'agent-1',
				threadId: 'thread-1',
				memory: {
					resource: 'user-1',
					thread: 'thread-1',
				},
			}),
			expect.any(Function),
		);
	});
});
