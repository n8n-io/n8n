import { executeResumableStream } from '../resumable-stream-executor';

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

describe('executeResumableStream', () => {
	it('returns suspension details in manual mode', async () => {
		const eventBus = createEventBus();

		const result = await executeResumableStream({
			agent: {},
			stream: {
				runId: 'mastra-run-1',
				fullStream: fromChunks([
					{ type: 'text-delta', payload: { text: 'Working...' } },
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tool-call-1',
							toolName: 'ask-user',
							suspendPayload: {
								requestId: 'request-1',
								message: 'Need approval',
							},
						},
					},
				]),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus,
				signal: new AbortController().signal,
			},
			control: { mode: 'manual' },
		});

		expect(result).toEqual(
			expect.objectContaining({
				status: 'suspended',
				mastraRunId: 'mastra-run-1',
				suspension: {
					toolCallId: 'tool-call-1',
					requestId: 'request-1',
					toolName: 'ask-user',
				},
			}),
		);
		expect(eventBus.publish).toHaveBeenCalledWith(
			'thread-1',
			expect.objectContaining({ type: 'text-delta', runId: 'run-1', agentId: 'agent-1' }),
		);
		expect(eventBus.publish).toHaveBeenCalledWith(
			'thread-1',
			expect.objectContaining({
				type: 'confirmation-request',
				runId: 'run-1',
				agentId: 'agent-1',
			}),
		);
	});

	it('auto-resumes suspended streams and surfaces queued corrections', async () => {
		const eventBus = createEventBus();
		const resumeStream = jest.fn().mockResolvedValue({
			runId: 'mastra-run-2',
			fullStream: fromChunks([{ type: 'text-delta', payload: { text: 'Done.' } }]),
			text: Promise.resolve('Done.'),
		});
		const waitForConfirmation = jest.fn().mockResolvedValue({ approved: true });

		const result = await executeResumableStream({
			agent: { resumeStream },
			stream: {
				runId: 'mastra-run-1',
				fullStream: fromChunks([
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tool-call-1',
							toolName: 'pause-for-user',
							suspendPayload: {
								requestId: 'request-1',
								message: 'Please confirm',
							},
						},
					},
				]),
				text: Promise.resolve('Initial text'),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus,
				signal: new AbortController().signal,
			},
			control: {
				mode: 'auto',
				waitForConfirmation,
				drainCorrections: () => ['Prefer Slack instead of email'],
			},
		});

		expect(waitForConfirmation).toHaveBeenCalledWith('request-1');
		expect(resumeStream).toHaveBeenCalledWith(
			{ approved: true },
			{ runId: 'mastra-run-1', toolCallId: 'tool-call-1' },
		);
		expect(result.status).toBe('completed');
		expect(result.mastraRunId).toBe('mastra-run-2');
		await expect(result.text ?? Promise.resolve('')).resolves.toBe('Done.');
		expect(eventBus.publish).toHaveBeenCalledWith(
			'thread-1',
			expect.objectContaining({
				type: 'text-delta',
				payload: { text: '\n[USER CORRECTION]: Prefer Slack instead of email\n' },
			}),
		);
	});
});
