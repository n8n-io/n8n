import type { SuspensionInfo } from '../../utils/stream-helpers';
import { executeResumableStream, normalizeStreamSource } from '../resumable-stream-executor';

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

function createLogger() {
	return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

async function* fromChunks(chunks: unknown[]) {
	for (const chunk of chunks) {
		await Promise.resolve();
		yield chunk;
	}
}

function readableFromChunks(chunks: unknown[]) {
	return new ReadableStream<unknown>({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(chunk);
			}
			controller.close();
		},
	});
}

function textChunk(text: string) {
	return { type: 'text-delta', delta: text };
}

function errorChunk(error: unknown) {
	return { type: 'error', error };
}

function suspensionChunk(input: {
	toolCallId: string;
	toolName?: string;
	suspendPayload?: Record<string, unknown>;
	input?: Record<string, unknown>;
}) {
	return {
		type: 'tool-call-suspended',
		toolCallId: input.toolCallId,
		...(input.toolName ? { toolName: input.toolName } : {}),
		...(input.input ? { input: input.input } : {}),
		suspendPayload: input.suspendPayload ?? {},
	};
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
	responseId?: string;
	payload?: {
		requestId?: string;
		toolCallId?: string;
		text?: string;
	};
}

describe('normalizeStreamSource', () => {
	it('normalizes native @n8n/agents streams', async () => {
		const source = normalizeStreamSource({
			runId: 'agent-run-1',
			stream: readableFromChunks([
				textChunk('Hello'),
				{
					type: 'message',
					message: {
						role: 'assistant',
						content: [{ type: 'text', text: ' world' }],
					},
				},
			]),
			getState: jest.fn(),
		});

		expect(source.runId).toBe('agent-run-1');
		await expect(source.text).resolves.toBe('Hello');
	});
});

describe('executeResumableStream', () => {
	it('buffers the confirmation event in manual mode', async () => {
		const eventBus = createEventBus();

		const result = await executeResumableStream({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([
					textChunk('Working...'),
					suspensionChunk({
						toolCallId: 'tool-call-1',
						toolName: 'ask-user',
						suspendPayload: {
							requestId: 'request-1',
							message: 'Need approval',
						},
					}),
				]),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus,
				signal: new AbortController().signal,
				logger: createLogger(),
			},
			control: { mode: 'manual' },
		});

		expect(result).toEqual(
			expect.objectContaining({
				status: 'suspended',
				agentRunId: 'agent-run-1',
				suspension: {
					toolCallId: 'tool-call-1',
					requestId: 'request-1',
					toolName: 'ask-user',
					suspendPayload: { requestId: 'request-1', message: 'Need approval' },
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
		expect(result.confirmationEvent?.payload.requestId).toBe('request-1');
	});

	it('returns errored status when stream contains an error chunk', async () => {
		const result = await executeResumableStream({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([textChunk('Working...'), errorChunk(new Error('Not Found'))]),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus: createEventBus(),
				signal: new AbortController().signal,
				logger: createLogger(),
			},
			control: { mode: 'manual' },
		});

		expect(result.status).toBe('errored');
		expect(result.agentRunId).toBe('agent-run-1');
	});

	it('reports liveness activity for each consumed chunk', async () => {
		const onActivity = jest.fn();

		await executeResumableStream({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([textChunk('Working...'), textChunk('Done.')]),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus: createEventBus(),
				signal: new AbortController().signal,
				logger: createLogger(),
				onActivity,
			},
			control: { mode: 'manual' },
		});

		expect(onActivity).toHaveBeenCalledTimes(2);
	});

	it('assigns stable response IDs from native start-step chunks', async () => {
		const eventBus = createEventBus();

		await executeResumableStream({
			agent: {},
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([
					{ type: 'start-step' },
					textChunk('First'),
					{
						type: 'tool-call',
						toolCallId: 'tool-call-1',
						toolName: 'test-tool',
						input: {},
					},
					textChunk(' step'),
					{ type: 'finish-step' },
					{ type: 'start-step' },
					textChunk('Second step'),
				]),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus,
				signal: new AbortController().signal,
				logger: createLogger(),
			},
			control: { mode: 'manual' },
		});

		const publishedEvents = eventBus.publish.mock.calls.map(
			([, event]: [string, PublishedEvent]) => event,
		);
		const firstText = publishedEvents.find((event) => event.payload?.text === 'First');
		const toolCall = publishedEvents.find((event) => event.type === 'tool-call');
		const firstStepContinuation = publishedEvents.find((event) => event.payload?.text === ' step');
		const secondText = publishedEvents.find((event) => event.payload?.text === 'Second step');

		expect(firstText?.responseId).toBe('agent-run-1:step:1');
		expect(toolCall?.responseId).toBe('agent-run-1:step:1');
		expect(firstStepContinuation?.responseId).toBe('agent-run-1:step:1');
		expect(secondText?.responseId).toBe('agent-run-1:step:2');
	});

	it('auto-resumes suspended streams and passes drained corrections to resume data', async () => {
		const eventBus = createEventBus();
		const resume = jest.fn().mockResolvedValue({
			runId: 'agent-run-2',
			stream: readableFromChunks([textChunk('Done.')]),
		});
		const waitForConfirmation = jest.fn().mockResolvedValue({ approved: true });
		let hasDrainedCorrection = false;

		const result = await executeResumableStream({
			agent: { resume },
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([
					suspensionChunk({
						toolCallId: 'tool-call-1',
						toolName: 'pause-for-user',
						suspendPayload: {
							requestId: 'request-1',
							message: 'Please confirm',
						},
					}),
				]),
				text: Promise.resolve('Initial text'),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus,
				signal: new AbortController().signal,
				logger: createLogger(),
			},
			control: {
				mode: 'auto',
				waitForConfirmation,
				drainCorrections: () => {
					if (hasDrainedCorrection) {
						return [];
					}

					hasDrainedCorrection = true;
					return ['Prefer Slack instead of email'];
				},
			},
		});

		expect(waitForConfirmation).toHaveBeenCalledWith('request-1');
		expect(resume).toHaveBeenCalledWith(
			'stream',
			expect.objectContaining({
				__correctionOverride: true,
				corrections: ['Prefer Slack instead of email'],
			}),
			{ runId: 'agent-run-1', toolCallId: 'tool-call-1' },
		);
		expect(result.status).toBe('completed');
		expect(result.agentRunId).toBe('agent-run-2');
		await expect(result.text ?? Promise.resolve('')).resolves.toBe('Done.');
		expect(eventBus.publish).toHaveBeenCalledWith(
			'thread-1',
			expect.objectContaining({
				type: 'text-delta',
				payload: { text: '\n[USER CORRECTION]: Prefer Slack instead of email\n' },
			}),
		);
	});

	it('passes resume options from the control hook', async () => {
		const resume = jest.fn().mockResolvedValue({
			runId: 'agent-run-2',
			stream: readableFromChunks([textChunk('Done.')]),
		});

		await executeResumableStream({
			agent: { resume },
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([
					suspensionChunk({
						toolCallId: 'tool-call-1',
						toolName: 'pause-for-user',
						suspendPayload: { requestId: 'request-1' },
					}),
				]),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus: createEventBus(),
				signal: new AbortController().signal,
				logger: createLogger(),
			},
			control: {
				mode: 'auto',
				waitForConfirmation: async () => await Promise.resolve({ approved: true }),
				buildResumeOptions: ({ agentRunId, suspension }) => ({
					runId: agentRunId,
					toolCallId: suspension.toolCallId,
					maxIterations: 5,
				}),
			},
		});

		expect(resume).toHaveBeenCalledWith(
			'stream',
			{ approved: true },
			{ runId: 'agent-run-1', toolCallId: 'tool-call-1', maxIterations: 5 },
		);
	});

	it('registers auto confirmations before the stream finishes draining', async () => {
		const eventBus = createEventBus();
		const finishGate = createDeferred<undefined>();
		const approval = createDeferred<Record<string, unknown>>();
		const waitStarted = createDeferred<undefined>();
		const resume = jest.fn().mockResolvedValue({
			runId: 'agent-run-2',
			stream: readableFromChunks([textChunk('Done.')]),
		});
		const waitForConfirmation = jest.fn().mockImplementation(async () => {
			waitStarted.resolve(undefined);
			return await approval.promise;
		});

		const execution = executeResumableStream({
			agent: { resume },
			stream: {
				runId: 'agent-run-1',
				fullStream: (async function* () {
					yield suspensionChunk({
						toolCallId: 'tool-call-1',
						toolName: 'pause-for-user',
						suspendPayload: {
							requestId: 'request-1',
							message: 'Please confirm',
						},
					});
					await finishGate.promise;
					yield { type: 'finish', finishReason: 'tool-calls' };
				})(),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus,
				signal: new AbortController().signal,
				logger: createLogger(),
			},
			control: {
				mode: 'auto',
				waitForConfirmation,
			},
		});

		await waitStarted.promise;

		expect(waitForConfirmation).toHaveBeenCalledWith('request-1');
		expect(resume).not.toHaveBeenCalled();
		const publishCalls = eventBus.publish.mock.calls as Array<[string, PublishedEvent]>;
		const confirmationEvent = publishCalls.find(
			([, event]) => event.type === 'confirmation-request',
		);
		expect(confirmationEvent?.[0]).toBe('thread-1');
		expect(confirmationEvent?.[1].payload?.requestId).toBe('request-1');

		approval.resolve({ approved: true });
		finishGate.resolve(undefined);

		await expect(execution).resolves.toEqual(
			expect.objectContaining({
				status: 'completed',
				agentRunId: 'agent-run-2',
			}),
		);
	});

	it('surfaces only the first actionable suspension in a drain', async () => {
		const eventBus = createEventBus();
		const resume = jest.fn().mockResolvedValue({
			runId: 'agent-run-2',
			stream: readableFromChunks([textChunk('Done.')]),
		});
		const waitForConfirmation = jest.fn().mockResolvedValue({ approved: true });
		const onSuspension = jest.fn((_: SuspensionInfo) => undefined);

		await executeResumableStream({
			agent: { resume },
			stream: {
				runId: 'agent-run-1',
				fullStream: fromChunks([
					suspensionChunk({
						toolCallId: 'tool-call-1',
						toolName: 'pause-for-user',
						suspendPayload: {
							requestId: 'request-1',
							message: 'First confirmation',
						},
					}),
					suspensionChunk({
						toolCallId: 'tool-call-2',
						toolName: 'pause-for-user',
						suspendPayload: {
							requestId: 'request-2',
							message: 'Second confirmation',
						},
					}),
					{ type: 'finish', finishReason: 'tool-calls' },
				]),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus,
				signal: new AbortController().signal,
				logger: createLogger(),
			},
			control: {
				mode: 'auto',
				waitForConfirmation,
				onSuspension,
			},
		});

		expect(onSuspension).toHaveBeenCalledTimes(1);
		expect(onSuspension).toHaveBeenCalledWith({
			requestId: 'request-1',
			toolCallId: 'tool-call-1',
			toolName: 'pause-for-user',
			suspendPayload: { requestId: 'request-1', message: 'First confirmation' },
		});
		expect(waitForConfirmation).toHaveBeenCalledTimes(1);
		expect(waitForConfirmation).toHaveBeenCalledWith('request-1');

		const confirmationEvents = (eventBus.publish.mock.calls as Array<[string, PublishedEvent]>)
			.map(([, event]) => event)
			.filter((event) => event.type === 'confirmation-request');
		expect(confirmationEvents).toHaveLength(1);
		expect(confirmationEvents[0].payload?.requestId).toBe('request-1');
	});
});
