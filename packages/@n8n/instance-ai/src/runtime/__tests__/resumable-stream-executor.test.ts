jest.mock('langsmith', () => {
	const createdRuns: Array<{
		id: string;
		name: string;
		run_type: string;
		parent_run_id?: string;
		metadata?: Record<string, unknown>;
		inputs?: Record<string, unknown>;
		outputs?: Record<string, unknown>;
		events?: Array<Record<string, unknown>>;
	}> = [];
	let runCounter = 0;

	class MockRunTree {
		id: string;
		name: string;
		run_type: string;
		project_name: string;
		parent_run?: MockRunTree;
		parent_run_id?: string;
		start_time: number;
		end_time?: number;
		tags?: string[];
		extra: { metadata?: Record<string, unknown> };
		inputs: Record<string, unknown>;
		outputs?: Record<string, unknown>;
		trace_id: string;
		dotted_order: string;
		execution_order: number;
		child_execution_order: number;
		events?: Array<Record<string, unknown>>;

		constructor(config: {
			id?: string;
			name: string;
			run_type?: string;
			project_name?: string;
			parent_run?: MockRunTree;
			parent_run_id?: string;
			start_time?: number;
			metadata?: Record<string, unknown>;
			tags?: string[];
			inputs?: Record<string, unknown>;
			outputs?: Record<string, unknown>;
			trace_id?: string;
			dotted_order?: string;
			execution_order?: number;
			child_execution_order?: number;
		}) {
			runCounter += 1;
			this.id = config.id ?? `run-${runCounter}`;
			this.name = config.name;
			this.run_type = config.run_type ?? 'chain';
			this.project_name = config.project_name ?? 'instance-ai';
			this.parent_run = config.parent_run;
			this.parent_run_id = config.parent_run_id;
			this.start_time = config.start_time ?? runCounter;
			this.tags = config.tags;
			this.extra = config.metadata ? { metadata: { ...config.metadata } } : {};
			this.inputs = config.inputs ?? {};
			this.outputs = config.outputs;
			this.trace_id = config.trace_id ?? this.parent_run?.trace_id ?? this.id;
			this.dotted_order =
				config.dotted_order ??
				(this.parent_run ? `${this.parent_run.dotted_order}.${this.id}` : this.id);
			this.execution_order = config.execution_order ?? 1;
			this.child_execution_order = config.child_execution_order ?? this.execution_order;
			this.events = [];
			createdRuns.push({
				id: this.id,
				name: this.name,
				run_type: this.run_type,
				...(this.parent_run_id ? { parent_run_id: this.parent_run_id } : {}),
				...(this.extra.metadata ? { metadata: this.extra.metadata } : {}),
				...(Object.keys(this.inputs).length > 0 ? { inputs: this.inputs } : {}),
			});
		}

		get metadata(): Record<string, unknown> | undefined {
			return this.extra.metadata;
		}

		set metadata(metadata: Record<string, unknown> | undefined) {
			this.extra = metadata ? { metadata: { ...metadata } } : {};
			const run = createdRuns.find((candidate) => candidate.id === this.id);
			if (run) {
				run.metadata = metadata;
			}
		}

		createChild(config: {
			name: string;
			run_type?: string;
			tags?: string[];
			metadata?: Record<string, unknown>;
			inputs?: Record<string, unknown>;
		}): MockRunTree {
			const childExecutionOrder = this.child_execution_order + 1;
			const child = new MockRunTree({
				...config,
				parent_run: this,
				parent_run_id: this.id,
				project_name: this.project_name,
				trace_id: this.trace_id,
				execution_order: childExecutionOrder,
				child_execution_order: childExecutionOrder,
			});
			this.child_execution_order = childExecutionOrder;
			return child;
		}

		async postRun(): Promise<void> {
			await Promise.resolve();
		}

		async end(
			outputs?: Record<string, unknown>,
			_error?: string,
			endTime = Date.now(),
			metadata?: Record<string, unknown>,
		): Promise<void> {
			this.outputs = outputs;
			this.end_time = endTime;
			if (metadata) {
				this.metadata = { ...(this.metadata ?? {}), ...metadata };
			}
			const run = createdRuns.find((candidate) => candidate.id === this.id);
			if (run) {
				run.outputs = outputs;
			}
			await Promise.resolve();
		}

		async patchRun(): Promise<void> {
			await Promise.resolve();
		}

		addEvent(event: Record<string, unknown> | string): void {
			const normalizedEvent = typeof event === 'string' ? { message: event } : event;
			this.events?.push(normalizedEvent);
			const run = createdRuns.find((candidate) => candidate.id === this.id);
			if (run) {
				run.events = [...(run.events ?? []), normalizedEvent];
			}
		}
	}

	return {
		RunTree: MockRunTree,
		__mock: {
			reset: () => {
				runCounter = 0;
				createdRuns.length = 0;
			},
			getCreatedRuns: () => createdRuns,
		},
	};
});

jest.mock('langsmith/traceable', () => {
	let currentRunTree: unknown;

	return {
		getCurrentRunTree: () => currentRunTree,
		withRunTree: async <T>(runTree: unknown, fn: () => Promise<T>): Promise<T> => {
			const previous = currentRunTree;
			currentRunTree = runTree;
			try {
				return await fn();
			} finally {
				currentRunTree = previous;
			}
		},
	};
});

import { RunTree } from 'langsmith';
import { withRunTree } from 'langsmith/traceable';

import type { SuspensionInfo } from '../../utils/stream-helpers';
import { createLlmStepTraceHooks, executeResumableStream } from '../resumable-stream-executor';

type LangSmithRuntimeMock = {
	__mock: {
		reset: () => void;
		getCreatedRuns: () => Array<{
			id: string;
			name: string;
			run_type: string;
			parent_run_id?: string;
			metadata?: Record<string, unknown>;
			inputs?: Record<string, unknown>;
			outputs?: Record<string, unknown>;
			events?: Array<Record<string, unknown>>;
		}>;
	};
};

const { __mock: langsmithMock } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('langsmith') as LangSmithRuntimeMock;

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
	beforeEach(() => {
		langsmithMock.reset();
	});

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
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
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

	it('returns errored status when stream contains an error chunk', async () => {
		const eventBus = createEventBus();

		const result = await executeResumableStream({
			agent: {},
			stream: {
				runId: 'mastra-run-1',
				fullStream: fromChunks([
					{ type: 'text-delta', payload: { text: 'Working...' } },
					{
						type: 'error',
						runId: 'mastra-run-1',
						from: 'AGENT',
						payload: { error: new Error('Not Found') },
					},
				]),
			},
			context: {
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				eventBus,
				signal: new AbortController().signal,
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
			},
			control: { mode: 'manual' },
		});

		expect(result.status).toBe('errored');
		expect(result.mastraRunId).toBe('mastra-run-1');
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
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
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
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
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
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
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

	it('creates llm child spans with usage metadata and first-token events', async () => {
		const eventBus = createEventBus();
		const parentRun = new RunTree({
			name: 'orchestrator',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-5',
				agent_role: 'orchestrator',
			},
		});

		await withRunTree(parentRun, async () => {
			await executeResumableStream({
				agent: {},
				stream: {
					runId: 'mastra-run-1',
					fullStream: fromChunks([
						{
							type: 'step-start',
							payload: {
								messageId: 'message-1',
								request: {
									body: JSON.stringify({
										messages: [{ role: 'user', content: 'List my workflows' }],
									}),
								},
								warnings: [],
							},
						},
						{ type: 'text-delta', payload: { text: 'Let me check.' } },
						{
							type: 'step-finish',
							payload: {
								messageId: 'message-1',
								response: {
									id: 'resp-1',
									modelId: 'claude-sonnet-4-5',
									messages: [
										{
											id: 'assistant-1',
											role: 'assistant',
											content: 'Let me check.',
										},
									],
								},
								output: {
									text: 'Let me check.',
									toolCalls: [],
									toolResults: [],
									usage: {
										promptTokens: 21,
										completionTokens: 7,
										totalTokens: 28,
										cachedInputTokens: 4,
										raw: {
											inputTokens: {
												cacheWrite: 2,
											},
										},
									},
								},
								metadata: {
									request: {
										body: {
											messages: [{ role: 'user', content: 'List my workflows' }],
										},
									},
									providerMetadata: undefined,
								},
								stepResult: {
									reason: 'stop',
									warnings: [],
									isContinued: false,
								},
							},
						},
						{ type: 'finish', finishReason: 'stop' },
					]),
					steps: Promise.resolve([]),
				},
				context: {
					threadId: 'thread-1',
					runId: 'run-1',
					agentId: 'agent-1',
					eventBus,
					signal: new AbortController().signal,
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
				},
				control: { mode: 'manual' },
			});
		});

		const llmRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-5');
		expect(llmRun).toBeDefined();
		expect(llmRun?.outputs?.messages).toEqual([
			{
				id: 'assistant-1',
				role: 'assistant',
				content: 'Let me check.',
			},
		]);
		expect(llmRun?.outputs?.choices).toEqual([
			{
				message: {
					id: 'assistant-1',
					role: 'assistant',
					content: 'Let me check.',
				},
			},
		]);
		expect(llmRun?.outputs?.usage_metadata).toMatchObject({
			input_tokens: 21,
			output_tokens: 7,
			total_tokens: 28,
			input_token_details: {
				cache_read: 4,
				cache_creation: 2,
			},
		});
		expect(llmRun?.events).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'new_token' })]),
		);
		expect(llmRun?.metadata).toEqual(
			expect.objectContaining({
				ls_provider: 'anthropic',
				ls_model_name: 'claude-sonnet-4-5',
				finish_reason: 'stop',
			}),
		);
	});

	it('normalizes llm hook outputs and records usage metadata for tool-calling steps', async () => {
		const parentRun = new RunTree({
			name: 'subagent:workflow-builder',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'workflow-builder',
			},
		});

		await withRunTree(parentRun, async () => {
			const hooks = createLlmStepTraceHooks();
			const prepareStep =
				hooks?.executionOptions.prepareStep ?? hooks?.executionOptions.experimental_prepareStep;

			await prepareStep?.({
				stepNumber: 0,
				messages: [{ role: 'user', content: 'Build the workflow' }],
			});
			hooks?.onStreamChunk({ type: 'text-delta', payload: { text: 'Let me write it.' } });

			await hooks?.executionOptions.onStepFinish({
				stepNumber: 0,
				text: 'Let me write it.',
				reasoning: undefined,
				toolCalls: [
					{
						toolCallId: 'native-1',
						toolName: 'mastra_workspace_write_file',
						args: {
							path: '/tmp/workflow.ts',
							content: 'export default workflow',
						},
					},
				],
				toolResults: [
					{
						toolCallId: 'native-1',
						toolName: 'mastra_workspace_write_file',
						result: 'Wrote 23 bytes',
					},
				],
				finishReason: 'tool-calls',
				usage: {
					promptTokens: 30,
					completionTokens: 8,
					totalTokens: 38,
				},
				request: {
					body: {
						messages: [{ role: 'user', content: 'Build the workflow' }],
					},
				},
				response: {
					modelId: 'claude-sonnet-4-6',
					messages: [
						{
							role: 'assistant',
							content: [
								{ type: 'text', text: 'Let me write it.' },
								{
									type: 'tool-call',
									toolCallId: 'native-1',
									toolName: 'mastra_workspace_write_file',
									args: {
										path: '/tmp/workflow.ts',
										content: 'export default workflow',
									},
								},
							],
						},
					],
				},
				providerMetadata: undefined,
			});
		});

		const llmRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRun).toBeDefined();
		expect(llmRun?.outputs?.messages).toEqual([
			{
				role: 'assistant',
				content: 'Let me write it.\n\n[Calling tools: mastra_workspace_write_file]',
			},
		]);
		expect(llmRun?.outputs?.requested_tools).toEqual([
			{
				toolCallId: 'native-1',
				toolName: 'mastra_workspace_write_file',
			},
		]);
		expect(llmRun?.outputs).not.toHaveProperty('tool_results');
		expect(llmRun?.outputs?.usage_metadata).toMatchObject({
			input_tokens: 30,
			output_tokens: 8,
			total_tokens: 38,
		});
	});

	it('preserves usage metadata from step-finish chunks when hook callbacks omit it', async () => {
		const parentRun = new RunTree({
			name: 'subagent:workflow-builder',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'workflow-builder',
			},
		});

		await withRunTree(parentRun, async () => {
			const hooks = createLlmStepTraceHooks();
			const prepareStep =
				hooks?.executionOptions.prepareStep ?? hooks?.executionOptions.experimental_prepareStep;

			await prepareStep?.({
				stepNumber: 0,
				messages: [{ role: 'user', content: 'Build the workflow' }],
			});
			hooks?.onStreamChunk({ type: 'text-delta', payload: { text: 'Let me write it.' } });
			hooks?.onStreamChunk({
				type: 'step-finish',
				payload: {
					messageId: 'step-1',
					response: {
						modelId: 'claude-sonnet-4-6',
						messages: [
							{
								id: 'assistant-1',
								role: 'assistant',
								content: 'Let me write it.',
							},
						],
					},
					output: {
						text: 'Let me write it.',
						toolCalls: [
							{
								toolCallId: 'native-1',
								toolName: 'mastra_workspace_write_file',
							},
						],
						toolResults: [],
						usage: {
							promptTokens: 41,
							completionTokens: 9,
							totalTokens: 50,
						},
					},
					metadata: {
						request: {
							body: {
								messages: [{ role: 'user', content: 'Build the workflow' }],
							},
						},
					},
					stepResult: {
						reason: 'tool-calls',
						warnings: [],
						isContinued: false,
					},
				},
			});

			await hooks?.executionOptions.onStepFinish({
				stepNumber: 0,
				text: 'Let me write it.',
				reasoning: undefined,
				toolCalls: [
					{
						toolCallId: 'native-1',
						toolName: 'mastra_workspace_write_file',
						args: {
							path: '/tmp/workflow.ts',
							content: 'export default workflow',
						},
					},
				],
				toolResults: [
					{
						toolCallId: 'native-1',
						toolName: 'mastra_workspace_write_file',
						result: 'Wrote 23 bytes',
					},
				],
				finishReason: 'tool-calls',
				request: {
					body: {
						messages: [{ role: 'user', content: 'Build the workflow' }],
					},
				},
				response: {
					modelId: 'claude-sonnet-4-6',
					messages: [
						{
							role: 'assistant',
							content: [
								{ type: 'text', text: 'Let me write it.' },
								{
									type: 'tool-call',
									toolCallId: 'native-1',
									toolName: 'mastra_workspace_write_file',
									args: {
										path: '/tmp/workflow.ts',
										content: 'export default workflow',
									},
								},
							],
						},
					],
				},
				providerMetadata: undefined,
			});
		});

		const llmRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRun?.outputs?.usage_metadata).toMatchObject({
			input_tokens: 41,
			output_tokens: 9,
			total_tokens: 50,
		});
	});

	it('ignores replayed step-finish events that have no matching step start', async () => {
		const parentRun = new RunTree({
			name: 'orchestrator',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'orchestrator',
			},
		});

		await withRunTree(parentRun, async () => {
			const hooks = createLlmStepTraceHooks();
			hooks?.startSegment();

			await hooks?.executionOptions.onStepFinish({
				stepNumber: 0,
				text: 'You can finish setup in the UI.',
				reasoning: [],
				toolCalls: [],
				toolResults: [],
				finishReason: 'stop',
				usage: {
					inputTokens: 18,
					outputTokens: 6,
					totalTokens: 24,
				},
				request: {
					body: {
						messages: [{ role: 'user', content: 'Finish setting this up' }],
					},
				},
				response: {
					modelId: 'claude-sonnet-4-6',
					messages: [
						{
							id: 'assistant-replayed',
							role: 'assistant',
							content: 'You can finish setup in the UI.',
						},
					],
				},
				providerMetadata: undefined,
			});
		});

		const llmRuns = langsmithMock
			.getCreatedRuns()
			.filter((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRuns).toHaveLength(0);
	});

	it('allows step numbers to restart in a new stream segment', async () => {
		const parentRun = new RunTree({
			name: 'orchestrator',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'orchestrator',
			},
		});

		await withRunTree(parentRun, async () => {
			const hooks = createLlmStepTraceHooks();
			const onStepStart = hooks?.executionOptions.experimental_onStepStart;
			hooks?.startSegment();

			await onStepStart?.({
				stepNumber: 0,
				model: {
					provider: 'anthropic',
					modelId: 'claude-sonnet-4-6',
				},
				messages: [{ role: 'user', content: 'First turn' }],
			});
			await hooks?.executionOptions.onStepFinish({
				stepNumber: 0,
				text: 'First response',
				reasoning: [],
				toolCalls: [],
				toolResults: [],
				finishReason: 'stop',
				usage: {
					inputTokens: 10,
					outputTokens: 4,
					totalTokens: 14,
				},
				request: {
					body: {
						messages: [{ role: 'user', content: 'First turn' }],
					},
				},
				response: {
					modelId: 'claude-sonnet-4-6',
					messages: [
						{
							id: 'assistant-1',
							role: 'assistant',
							content: 'First response',
						},
					],
				},
				providerMetadata: undefined,
			});

			hooks?.startSegment();
			await onStepStart?.({
				stepNumber: 0,
				model: {
					provider: 'anthropic',
					modelId: 'claude-sonnet-4-6',
				},
				messages: [{ role: 'user', content: 'Second turn' }],
			});
			await hooks?.executionOptions.onStepFinish({
				stepNumber: 0,
				text: 'Second response',
				reasoning: [],
				toolCalls: [],
				toolResults: [],
				finishReason: 'stop',
				usage: {
					inputTokens: 11,
					outputTokens: 5,
					totalTokens: 16,
				},
				request: {
					body: {
						messages: [{ role: 'user', content: 'Second turn' }],
					},
				},
				response: {
					modelId: 'claude-sonnet-4-6',
					messages: [
						{
							id: 'assistant-2',
							role: 'assistant',
							content: 'Second response',
						},
					],
				},
				providerMetadata: undefined,
			});
		});

		const llmRuns = langsmithMock
			.getCreatedRuns()
			.filter((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRuns).toHaveLength(2);
		expect(llmRuns.map((run) => run.outputs?.messages)).toEqual([
			[{ id: 'assistant-1', role: 'assistant', content: 'First response' }],
			[{ id: 'assistant-2', role: 'assistant', content: 'Second response' }],
		]);
	});

	it('creates synthetic tool spans for native Mastra tools', async () => {
		const eventBus = createEventBus();
		const parentRun = new RunTree({
			name: 'subagent:workflow-builder',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'workflow-builder',
			},
		});

		await withRunTree(parentRun, async () => {
			await executeResumableStream({
				agent: {},
				stream: {
					runId: 'mastra-run-3',
					fullStream: fromChunks([
						{
							type: 'tool-call',
							payload: {
								toolCallId: 'native-tool-1',
								toolName: 'mastra_workspace_execute_command',
								args: {
									command: 'echo hello',
								},
							},
						},
						{
							type: 'tool-result',
							payload: {
								toolCallId: 'native-tool-1',
								toolName: 'mastra_workspace_execute_command',
								result: 'hello',
							},
						},
						{ type: 'finish', finishReason: 'stop' },
					]),
				},
				context: {
					threadId: 'thread-1',
					runId: 'run-3',
					agentId: 'agent-3',
					eventBus,
					signal: new AbortController().signal,
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
				},
				control: { mode: 'manual' },
			});
		});

		const toolRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'tool:mastra_workspace_execute_command');
		expect(toolRun).toBeDefined();
		expect(toolRun?.metadata).toEqual(
			expect.objectContaining({
				synthetic_tool_trace: true,
				tool_name: 'mastra_workspace_execute_command',
			}),
		);
		expect(toolRun?.outputs).toEqual({
			result: 'hello',
		});
	});

	it('groups synthetic tool spans under the active llm run', async () => {
		const eventBus = createEventBus();
		const parentRun = new RunTree({
			name: 'orchestrator',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'orchestrator',
			},
		});

		await withRunTree(parentRun, async () => {
			const hooks = createLlmStepTraceHooks();
			const prepareStep =
				hooks?.executionOptions.prepareStep ?? hooks?.executionOptions.experimental_prepareStep;

			await prepareStep?.({
				stepNumber: 0,
				model: {
					provider: 'anthropic',
					modelId: 'claude-sonnet-4-6',
				},
				messages: [{ role: 'user', content: 'Build the weather workflow' }],
			});

			async function* streamWithToolCall() {
				yield {
					type: 'tool-call',
					payload: {
						toolCallId: 'native-tool-turn-1',
						toolName: 'mastra_workspace_execute_command',
						args: { command: 'echo hello' },
					},
				};
				yield {
					type: 'tool-result',
					payload: {
						toolCallId: 'native-tool-turn-1',
						toolName: 'mastra_workspace_execute_command',
						result: 'hello',
					},
				};
				await hooks?.executionOptions.onStepFinish({
					stepNumber: 0,
					text: 'Done.',
					reasoning: [],
					toolCalls: [
						{
							toolCallId: 'native-tool-turn-1',
							toolName: 'mastra_workspace_execute_command',
						},
					],
					toolResults: [
						{
							toolCallId: 'native-tool-turn-1',
							toolName: 'mastra_workspace_execute_command',
							result: 'hello',
						},
					],
					finishReason: 'stop',
					usage: {
						inputTokens: 12,
						outputTokens: 3,
						totalTokens: 15,
					},
					response: {
						modelId: 'claude-sonnet-4-6',
						messages: [
							{
								id: 'assistant-turn-1',
								role: 'assistant',
								content: 'Done.',
							},
						],
					},
				});
				yield { type: 'finish', finishReason: 'stop' };
			}

			await executeResumableStream({
				agent: {},
				stream: {
					runId: 'mastra-run-turn-1',
					fullStream: streamWithToolCall(),
				},
				context: {
					threadId: 'thread-1',
					runId: 'run-turn-1',
					agentId: 'agent-turn-1',
					eventBus,
					signal: new AbortController().signal,
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
				},
				control: { mode: 'manual' },
				llmStepTraceHooks: hooks,
			});
		});

		const llmRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		const toolRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'tool:mastra_workspace_execute_command');

		expect(llmRun?.parent_run_id).toBe(parentRun.id);
		expect(toolRun?.parent_run_id).toBe(llmRun?.id);
	});

	it('creates llm child spans from resolved steps when step-start chunks are missing', async () => {
		const eventBus = createEventBus();
		const parentRun = new RunTree({
			name: 'subagent:data-table-manager',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'data-table-manager',
			},
		});

		await withRunTree(parentRun, async () => {
			await executeResumableStream({
				agent: {},
				stream: {
					runId: 'mastra-run-2',
					fullStream: fromChunks([
						{ type: 'text-delta', payload: { text: 'I found the matching tables.' } },
						{ type: 'finish', finishReason: 'stop' },
					]),
					steps: Promise.resolve([
						{
							text: 'I found the matching tables.',
							reasoning: [],
							toolCalls: [],
							toolResults: [],
							finishReason: 'stop',
							usage: {
								inputTokens: 31,
								outputTokens: 9,
								totalTokens: 40,
								cachedInputTokens: 6,
							},
							request: {
								body: {
									messages: [{ role: 'user', content: 'Find my habit tables' }],
								},
							},
							response: {
								modelId: 'claude-sonnet-4-6',
								messages: [
									{
										id: 'assistant-2',
										role: 'assistant',
										content: 'I found the matching tables.',
									},
								],
							},
							providerMetadata: undefined,
						},
					]),
				},
				context: {
					threadId: 'thread-1',
					runId: 'run-2',
					agentId: 'agent-2',
					eventBus,
					signal: new AbortController().signal,
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
				},
				control: { mode: 'manual' },
			});
		});

		const llmRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRun).toBeDefined();
		expect(llmRun?.outputs?.messages).toEqual([
			{
				id: 'assistant-2',
				role: 'assistant',
				content: 'I found the matching tables.',
			},
		]);
		expect(llmRun?.outputs?.usage_metadata).toMatchObject({
			input_tokens: 31,
			output_tokens: 9,
			total_tokens: 40,
			input_token_details: {
				cache_read: 6,
			},
		});
	});

	it('backfills usage metadata for hook-traced llm runs from resolved steps', async () => {
		const eventBus = createEventBus();
		const parentRun = new RunTree({
			name: 'orchestrator',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'orchestrator',
			},
		});

		await withRunTree(parentRun, async () => {
			const llmStepTraceHooks = createLlmStepTraceHooks();
			const prepareStep =
				llmStepTraceHooks?.executionOptions.prepareStep ??
				llmStepTraceHooks?.executionOptions.experimental_prepareStep;

			await executeResumableStream({
				agent: {},
				stream: {
					runId: 'mastra-run-5',
					fullStream: (async function* () {
						await prepareStep?.({
							stepNumber: 0,
							model: {
								provider: 'anthropic',
								modelId: 'claude-sonnet-4-6',
							},
							messages: [{ role: 'user', content: 'Build a weather workflow' }],
						});
						yield { type: 'text-delta', payload: { text: 'Done.' } };
						await llmStepTraceHooks?.executionOptions.onStepFinish({
							stepNumber: 0,
							text: 'Done.',
							reasoning: [],
							toolCalls: [],
							toolResults: [],
							finishReason: 'stop',
							request: {
								body: {
									messages: [{ role: 'user', content: 'Build a weather workflow' }],
								},
							},
							response: {
								modelId: 'claude-sonnet-4-6',
								messages: [
									{
										id: 'assistant-final',
										role: 'assistant',
										content: 'Done.',
									},
								],
							},
							providerMetadata: undefined,
						});
						yield { type: 'finish', finishReason: 'stop' };
					})(),
					steps: Promise.resolve([
						{
							stepNumber: 0,
							text: 'Done.',
							reasoning: [],
							toolCalls: [],
							toolResults: [],
							finishReason: 'stop',
							usage: {
								inputTokens: 64,
								outputTokens: 12,
								totalTokens: 76,
								cachedInputTokens: 8,
							},
							request: {
								body: {
									messages: [{ role: 'user', content: 'Build a weather workflow' }],
								},
							},
							response: {
								modelId: 'claude-sonnet-4-6',
								messages: [
									{
										id: 'assistant-final',
										role: 'assistant',
										content: 'Done.',
									},
								],
							},
							providerMetadata: undefined,
						},
					]),
				},
				context: {
					threadId: 'thread-1',
					runId: 'run-5',
					agentId: 'agent-5',
					eventBus,
					signal: new AbortController().signal,
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
				},
				control: { mode: 'manual' },
				llmStepTraceHooks,
			});
		});

		const llmRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRun?.outputs?.usage_metadata).toMatchObject({
			input_tokens: 64,
			output_tokens: 12,
			total_tokens: 76,
			input_token_details: {
				cache_read: 8,
			},
		});
	});

	it('maps uncached input, cache read, and cache write tokens from AI SDK usage', async () => {
		const eventBus = createEventBus();
		const parentRun = new RunTree({
			name: 'orchestrator',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'orchestrator',
			},
		});

		await withRunTree(parentRun, async () => {
			await executeResumableStream({
				agent: {},
				stream: {
					runId: 'mastra-run-usage-v3',
					fullStream: fromChunks([
						{
							type: 'step-start',
							payload: {
								messageId: 'message-usage-v3',
								request: {
									body: {
										messages: [{ role: 'user', content: 'Summarize this run' }],
									},
								},
							},
						},
						{ type: 'text-delta', payload: { text: 'Done.' } },
						{
							type: 'step-finish',
							payload: {
								messageId: 'message-usage-v3',
								response: {
									id: 'resp-usage-v3',
									modelId: 'claude-sonnet-4-6',
									messages: [
										{
											id: 'assistant-usage-v3',
											role: 'assistant',
											content: 'Done.',
										},
									],
								},
								output: {
									text: 'Done.',
									toolCalls: [],
									toolResults: [],
									usage: {
										inputTokens: 120,
										inputTokenDetails: {
											noCacheTokens: 90,
											cacheReadTokens: 20,
											cacheWriteTokens: 10,
										},
										outputTokens: 5,
										totalTokens: 125,
									},
								},
								metadata: {
									request: {
										body: {
											messages: [{ role: 'user', content: 'Summarize this run' }],
										},
									},
								},
								stepResult: {
									reason: 'stop',
									warnings: [],
									isContinued: false,
								},
							},
						},
						{ type: 'finish', finishReason: 'stop' },
					]),
				},
				context: {
					threadId: 'thread-usage-v3',
					runId: 'run-usage-v3',
					agentId: 'agent-usage-v3',
					eventBus,
					signal: new AbortController().signal,
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
				},
				control: { mode: 'manual' },
			});
		});

		const llmRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRun?.outputs?.usage_metadata).toMatchObject({
			input_tokens: 90,
			output_tokens: 5,
			total_tokens: 95,
			input_token_details: {
				cache_read: 20,
				cache_creation: 10,
			},
		});
		expect(llmRun?.outputs?.usage_debug).toMatchObject({
			record_usage: {
				inputTokens: 120,
				inputTokenDetails: {
					noCacheTokens: 90,
					cacheReadTokens: 20,
					cacheWriteTokens: 10,
				},
				outputTokens: 5,
				totalTokens: 125,
			},
		});
	});

	it('fills cache creation from Anthropic provider metadata when usage omits it', async () => {
		const parentRun = new RunTree({
			name: 'orchestrator',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'orchestrator',
			},
		});

		await withRunTree(parentRun, async () => {
			const hooks = createLlmStepTraceHooks();
			const prepareStep =
				hooks?.executionOptions.prepareStep ?? hooks?.executionOptions.experimental_prepareStep;

			await prepareStep?.({
				stepNumber: 0,
				model: {
					provider: 'anthropic',
					modelId: 'claude-sonnet-4-6',
				},
				messages: [{ role: 'user', content: 'Build the weather workflow' }],
			});
			hooks?.onStreamChunk({ type: 'text-delta', payload: { text: 'Done.' } });

			await hooks?.executionOptions.onStepFinish({
				stepNumber: 0,
				text: 'Done.',
				reasoning: [],
				toolCalls: [],
				toolResults: [],
				finishReason: 'stop',
				usage: {
					inputTokens: 90,
					outputTokens: 5,
					totalTokens: 95,
					cachedInputTokens: 20,
				},
				request: {
					body: {
						messages: [{ role: 'user', content: 'Build the weather workflow' }],
					},
				},
				response: {
					modelId: 'claude-sonnet-4-6',
					messages: [
						{
							id: 'assistant-provider-fallback',
							role: 'assistant',
							content: 'Done.',
						},
					],
				},
				providerMetadata: {
					anthropic: {
						cacheCreationInputTokens: 10,
						usage: {
							input_tokens: 90,
							output_tokens: 5,
							cache_read_input_tokens: 20,
							cache_creation_input_tokens: 10,
						},
					},
				},
			});
		});

		const llmRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRun?.outputs?.usage_metadata).toMatchObject({
			input_tokens: 90,
			output_tokens: 5,
			total_tokens: 95,
			input_token_details: {
				cache_read: 20,
				cache_creation: 10,
			},
		});
		expect(llmRun?.outputs?.usage_debug).toMatchObject({
			step_provider_metadata: {
				anthropic: {
					usage: {
						cache_creation_input_tokens: 10,
						cache_read_input_tokens: 20,
						input_tokens: 90,
						output_tokens: 5,
					},
				},
			},
		});
	});

	it('backfills suspended tool-calling llm usage from the stream usage promise', async () => {
		const eventBus = createEventBus();
		const parentRun = new RunTree({
			name: 'orchestrator',
			run_type: 'chain',
			project_name: 'instance-ai',
			metadata: {
				model_id: 'anthropic/claude-sonnet-4-6',
				agent_role: 'orchestrator',
			},
		});

		await withRunTree(parentRun, async () => {
			const llmStepTraceHooks = createLlmStepTraceHooks();
			const prepareStep =
				llmStepTraceHooks?.executionOptions.prepareStep ??
				llmStepTraceHooks?.executionOptions.experimental_prepareStep;

			const result = await executeResumableStream({
				agent: {},
				stream: {
					runId: 'mastra-run-suspended-usage',
					fullStream: (async function* () {
						await prepareStep?.({
							stepNumber: 0,
							model: {
								provider: 'anthropic',
								modelId: 'claude-sonnet-4-6',
							},
							messages: [{ role: 'user', content: 'Ask me a question' }],
						});
						yield { type: 'text-delta', payload: { text: 'I need one detail first.' } };
						await llmStepTraceHooks?.executionOptions.onStepFinish({
							stepNumber: 0,
							text: 'I need one detail first.',
							reasoning: [],
							toolCalls: [
								{
									toolCallId: 'ask-user-1',
									toolName: 'ask-user',
									args: {
										questions: [{ id: 'q1', question: 'Which city?', type: 'text' }],
									},
								},
							],
							toolResults: [],
							finishReason: 'tool-calls',
							request: {
								body: {
									messages: [{ role: 'user', content: 'Ask me a question' }],
								},
							},
							response: {
								modelId: 'claude-sonnet-4-6',
								messages: [
									{
										id: 'assistant-suspended-usage',
										role: 'assistant',
										content: [
											{ type: 'text', text: 'I need one detail first.' },
											{
												type: 'tool-call',
												toolCallId: 'ask-user-1',
												toolName: 'ask-user',
												args: {
													questions: [{ id: 'q1', question: 'Which city?', type: 'text' }],
												},
											},
										],
									},
								],
							},
							providerMetadata: undefined,
						});
						yield {
							type: 'tool-call',
							payload: {
								toolCallId: 'ask-user-1',
								toolName: 'ask-user',
								args: {
									questions: [{ id: 'q1', question: 'Which city?', type: 'text' }],
								},
							},
						};
						yield {
							type: 'tool-call-suspended',
							payload: {
								toolCallId: 'ask-user-1',
								toolName: 'ask-user',
								suspendPayload: {
									requestId: 'req-ask-user-1',
								},
							},
						};
					})(),
					usage: Promise.resolve({
						inputTokens: 120,
						inputTokenDetails: {
							noCacheTokens: 90,
							cacheReadTokens: 20,
							cacheWriteTokens: 10,
						},
						outputTokens: 5,
						totalTokens: 125,
					}),
				},
				context: {
					threadId: 'thread-suspended-usage',
					runId: 'run-suspended-usage',
					agentId: 'agent-suspended-usage',
					eventBus,
					signal: new AbortController().signal,
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
				},
				control: { mode: 'manual' },
				llmStepTraceHooks,
			});

			expect(result.status).toBe('suspended');
		});

		const llmRun = langsmithMock
			.getCreatedRuns()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRun?.outputs?.usage_metadata).toMatchObject({
			input_tokens: 90,
			output_tokens: 5,
			total_tokens: 95,
			input_token_details: {
				cache_read: 20,
				cache_creation: 10,
			},
		});
		expect(llmRun?.outputs?.usage_debug).toMatchObject({
			record_usage: {
				inputTokens: 120,
				inputTokenDetails: {
					noCacheTokens: 90,
					cacheReadTokens: 20,
					cacheWriteTokens: 10,
				},
				outputTokens: 5,
				totalTokens: 125,
			},
			stream_usage: {
				inputTokens: 120,
				inputTokenDetails: {
					noCacheTokens: 90,
					cacheReadTokens: 20,
					cacheWriteTokens: 10,
				},
				outputTokens: 5,
				totalTokens: 125,
			},
		});
	});
});
