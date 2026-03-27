import type { SuspensionInfo } from '../../utils/stream-helpers';
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

function createDeferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
}

interface PublishedEvent {
	type: string;
	payload?: {
		requestId?: string;
		toolCallId?: string;
		text?: string;
	};
}

describe('executeResumableStream', () => {
	it('buffers the confirmation event in manual mode', async () => {
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
		expect(eventBus.publish).not.toHaveBeenCalledWith(
			'thread-1',
			expect.objectContaining({ type: 'confirmation-request' }),
		);
		expect(result.confirmationEvent?.type).toBe('confirmation-request');
		expect(result.confirmationEvent?.runId).toBe('run-1');
		expect(result.confirmationEvent?.agentId).toBe('agent-1');
		expect(result.confirmationEvent?.payload.requestId).toBe('request-1');
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

	it('registers auto confirmations before the stream finishes draining', async () => {
		const eventBus = createEventBus();
		const finishGate = createDeferred<undefined>();
		const approval = createDeferred<Record<string, unknown>>();
		const waitStarted = createDeferred<undefined>();
		const resumeStream = jest.fn().mockResolvedValue({
			runId: 'mastra-run-2',
			fullStream: fromChunks([{ type: 'text-delta', payload: { text: 'Done.' } }]),
			text: Promise.resolve('Done.'),
		});
		const waitForConfirmation = jest.fn().mockImplementation(async () => {
			waitStarted.resolve(undefined);
			return await approval.promise;
		});

		const execution = executeResumableStream({
			agent: { resumeStream },
			stream: {
				runId: 'mastra-run-1',
				fullStream: (async function* () {
					yield {
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tool-call-1',
							toolName: 'pause-for-user',
							suspendPayload: {
								requestId: 'request-1',
								message: 'Please confirm',
							},
						},
					};
					await finishGate.promise;
					yield { type: 'finish', finishReason: 'tool-calls' };
				})(),
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
			},
		});

		await waitStarted.promise;

		expect(waitForConfirmation).toHaveBeenCalledWith('request-1');
		expect(resumeStream).not.toHaveBeenCalled();
		const publishCalls = eventBus.publish.mock.calls as Array<[string, PublishedEvent]>;
		const confirmationEvent = publishCalls.find(([, event]) => event.type === 'confirmation-request');
		expect(confirmationEvent?.[0]).toBe('thread-1');
		expect(confirmationEvent?.[1].payload?.requestId).toBe('request-1');

		approval.resolve({ approved: true });
		finishGate.resolve(undefined);

		await expect(execution).resolves.toEqual(
			expect.objectContaining({
				status: 'completed',
				mastraRunId: 'mastra-run-2',
			}),
		);
		expect(resumeStream).toHaveBeenCalledWith(
			{ approved: true },
			{ runId: 'mastra-run-1', toolCallId: 'tool-call-1' },
		);
	});

	it('surfaces only the first actionable suspension in a drain', async () => {
		const eventBus = createEventBus();
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const resumeStream = jest.fn().mockResolvedValue({
			runId: 'mastra-run-2',
			fullStream: fromChunks([{ type: 'text-delta', payload: { text: 'Done.' } }]),
			text: Promise.resolve('Done.'),
		});
		const waitForConfirmation = jest.fn().mockResolvedValue({ approved: true });
		const onSuspension = jest.fn((_: SuspensionInfo) => undefined);

		try {
			await executeResumableStream({
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
									message: 'First confirmation',
								},
							},
						},
						{
							type: 'tool-call-suspended',
							payload: {
								toolCallId: 'tool-call-2',
								toolName: 'pause-for-user',
								suspendPayload: {
									requestId: 'request-2',
									message: 'Second confirmation',
								},
							},
						},
						{ type: 'finish', finishReason: 'tool-calls' },
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
					onSuspension,
				},
			});
		} finally {
			warnSpy.mockRestore();
		}

		expect(onSuspension).toHaveBeenCalledTimes(1);
		expect(onSuspension).toHaveBeenCalledWith({
			requestId: 'request-1',
			toolCallId: 'tool-call-1',
			toolName: 'pause-for-user',
		});
		expect(waitForConfirmation).toHaveBeenCalledTimes(1);
		expect(waitForConfirmation).toHaveBeenCalledWith('request-1');
		expect(resumeStream).toHaveBeenCalledWith(
			{ approved: true },
			{ runId: 'mastra-run-1', toolCallId: 'tool-call-1' },
		);

		const confirmationEvents = (eventBus.publish.mock.calls as Array<[string, PublishedEvent]>)
			.map(([, event]) => event)
			.filter((event) => event.type === 'confirmation-request');
		expect(confirmationEvents).toHaveLength(1);
		expect(confirmationEvents[0].payload?.requestId).toBe('request-1');
		expect(confirmationEvents[0].payload?.toolCallId).toBe('tool-call-1');
	});
});
