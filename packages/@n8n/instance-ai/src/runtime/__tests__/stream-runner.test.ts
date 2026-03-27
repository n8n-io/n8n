import { streamAgentRun } from '../stream-runner';

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

describe('streamAgentRun', () => {
	it('returns errored status when agent stream contains an error chunk', async () => {
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

		const result = await streamAgentRun(agent, 'test input', {}, {
			threadId: 'thread-1',
			runId: 'run-1',
			agentId: 'agent-1',
			signal: new AbortController().signal,
			eventBus,
		});

		expect(result.status).toBe('errored');
		expect(result.mastraRunId).toBe('mastra-run-1');
	});

	it('returns completed status for successful streams', async () => {
		const eventBus = createEventBus();
		const agent = {
			stream: jest.fn().mockResolvedValue({
				runId: 'mastra-run-1',
				fullStream: fromChunks([
					{ type: 'text-delta', payload: { text: 'All good' } },
				]),
			}),
		};

		const result = await streamAgentRun(agent, 'test input', {}, {
			threadId: 'thread-1',
			runId: 'run-1',
			agentId: 'agent-1',
			signal: new AbortController().signal,
			eventBus,
		});

		expect(result.status).toBe('completed');
	});
});
