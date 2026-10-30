import { ASSISTANT_TRACE_EVENT } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	continueInstanceAiTraceContext,
	createInstanceAiTraceContext,
	emitBuilderMetric,
	releaseTraceClient,
	type InstanceAiTraceContext,
	type InstanceAiTraceRun,
} from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type {
	SystemAgentResumeTurn,
	SystemAgentStartTurn,
} from '@/modules/agents/system-agents/system-agent.types';

import type { InstanceAiBrowserSessionService } from '../../browser/instance-ai-browser-session.service';
import { AssistantTurnTrace, AssistantTurnTracer } from '../assistant-turn-trace';

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	createInstanceAiTraceContext: vi.fn(),
	continueInstanceAiTraceContext: vi.fn(),
	emitBuilderMetric: vi.fn(async () => {}),
	releaseTraceClient: vi.fn(),
}));

function traceRun(overrides: Partial<InstanceAiTraceRun>): InstanceAiTraceRun {
	return {
		id: 'run',
		name: 'run',
		runType: 'chain',
		projectName: 'instance-ai',
		startTime: 0,
		traceId: 'ls-trace-1',
		dottedOrder: '',
		executionOrder: 1,
		childExecutionOrder: 1,
		...overrides,
	};
}

function traceContext() {
	const rootRun = traceRun({
		id: 'root-1',
		otelTraceId: 'otel-1',
		metadata: { message_group_id: 'mg-1' },
	});
	const actorRun = traceRun({ id: 'actor-1', otelSpanId: 'span-1', parentRunId: 'root-1' });
	const startChildRun = vi.fn(async () => actorRun);
	const finishRun = vi.fn(async () => {});
	const failRun = vi.fn(async () => {});
	const withActiveSpan = vi.fn(
		async (_run: InstanceAiTraceRun, fn: () => Promise<unknown>) => await fn(),
	);
	const keepOpenUntilSettled = vi.fn((_operation: Promise<unknown>) => {});
	// A plain object: a deep mock would answer `endTime` with a function.
	const context = {
		projectName: 'instance-ai',
		traceKind: 'message_turn',
		rootRun,
		actorRun: rootRun,
		messageRun: rootRun,
		orchestratorRun: rootRun,
		startChildRun,
		finishRun,
		failRun,
		withActiveSpan,
		keepOpenUntilSettled,
	} as unknown as InstanceAiTraceContext;
	return {
		context,
		rootRun,
		actorRun,
		startChildRun,
		finishRun,
		withActiveSpan,
		keepOpenUntilSettled,
	};
}

function logger() {
	const log = mock<Logger>();
	log.scoped.mockReturnValue(log);
	return log;
}

describe('AssistantTurnTrace', () => {
	it('gives the trace ids for the chat and the anchor for a resume', async () => {
		const { context, startChildRun } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger(), { message: 'Hi' });

		await trace.startOrchestratorRun();

		expect(startChildRun).toHaveBeenCalledWith(
			context.rootRun,
			expect.objectContaining({
				name: 'agent: orchestrator',
				metadata: expect.objectContaining({ agent_role: 'orchestrator' }),
				inputs: { message: 'Hi' },
			}),
		);
		expect(trace.payload).toEqual({
			traceId: 'otel-1',
			langsmithTraceId: 'ls-trace-1',
			langsmithRunId: 'root-1',
		});
		expect(trace.hostMetadata()).toEqual({
			assistantTrace: {
				langsmithTraceId: 'ls-trace-1',
				rootRunId: 'root-1',
				actorRunId: 'actor-1',
				otelTraceId: 'otel-1',
				actorSpanId: 'span-1',
				messageGroupId: 'mg-1',
			},
		});
	});

	it('runs the turn with the orchestrator span active', async () => {
		const { context, actorRun, withActiveSpan } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());
		await trace.startOrchestratorRun();

		await expect(trace.withContext(async () => 'done')).resolves.toBe('done');

		expect(withActiveSpan).toHaveBeenCalledWith(actorRun, expect.any(Function));
	});

	it('finishes a completed turn with its reply and the run metadata', async () => {
		const { context, rootRun, actorRun, finishRun } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());
		await trace.startOrchestratorRun();

		trace.observeChunk({ type: 'tool-call', toolCallId: 'tc-1', toolName: 'workflows', input: {} });
		trace.observeChunk({ type: 'text-delta', id: 't-1', delta: 'Here is ' });
		trace.observeChunk({ type: 'text-delta', id: 't-1', delta: 'your workflow.' });
		await trace.finish({ status: 'completed' }, 'anthropic/claude-sonnet');

		const outputs = { status: 'completed', runId: 'run-1', response: 'Here is your workflow.' };
		expect(finishRun).toHaveBeenCalledWith(actorRun, {
			outputs,
			metadata: { final_status: 'completed', model_id: 'anthropic/claude-sonnet' },
		});
		expect(finishRun).toHaveBeenCalledWith(rootRun, {
			outputs,
			metadata: {
				final_status: 'completed',
				model_id: 'anthropic/claude-sonnet',
				completion_source: 'orchestrator',
				first_visible_state: 'assistant_text',
				first_tool_name: 'workflows',
			},
		});
		expect(releaseTraceClient).toHaveBeenCalledWith('ls-trace-1');
	});

	it('finishes a suspended turn with the tool that waits for the user', async () => {
		const { context, rootRun, finishRun } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());
		await trace.startOrchestratorRun();

		trace.observeChunk({
			type: 'tool-call-suspended',
			runId: 'agent-run-1',
			toolCallId: 'tc-1',
			toolName: 'ask-user',
			suspendPayload: { requestId: 'req-1', message: 'Which channel?' },
		});
		await trace.finish({ status: 'suspended' });

		expect(finishRun).toHaveBeenCalledWith(rootRun, {
			outputs: {
				status: 'suspended',
				runId: 'run-1',
				requestId: 'req-1',
				pendingToolCallId: 'tc-1',
				toolName: 'ask-user',
				message: 'Which channel?',
			},
			metadata: {
				final_status: 'suspended',
				completion_source: 'orchestrator',
				request_id: 'req-1',
				pending_tool_call_id: 'tc-1',
				pending_tool_name: 'ask-user',
			},
		});
	});

	it('records the first response metric once, on the first chunk the user sees', () => {
		const { context } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());
		vi.mocked(emitBuilderMetric).mockClear();

		trace.observeChunk({ type: 'start-step' });
		expect(emitBuilderMetric).not.toHaveBeenCalled();
		trace.observeChunk({ type: 'reasoning-delta', id: 'r-1', delta: 'Thinking' });
		trace.observeChunk({ type: 'text-delta', id: 't-1', delta: 'Hi' });

		expect(emitBuilderMetric).toHaveBeenCalledTimes(1);
		expect(emitBuilderMetric).toHaveBeenCalledWith(context, 'first_response', {
			success: true,
			phase: 'message',
		});
	});

	it('records a steered message as a span in the turn and counts it on the root', async () => {
		const { context, rootRun, actorRun, startChildRun, finishRun, keepOpenUntilSettled } =
			traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());
		await trace.startOrchestratorRun();

		trace.observeChunk({
			type: 'message-steered',
			queueId: 'queue-1',
			executionId: 'exec-1',
			message: {
				id: 'msg-2',
				role: 'user',
				content: [
					{ type: 'text', text: 'Use #general instead' },
					{ type: 'file', fileId: 'file-1', fileName: 'notes.txt' },
				],
			},
		});
		// The span exports in the background, and the trace stays open until it does.
		expect(keepOpenUntilSettled).toHaveBeenCalledTimes(1);
		await keepOpenUntilSettled.mock.calls[0][0];

		const recorded = { message: 'Use #general instead', fileCount: 1 };
		expect(startChildRun).toHaveBeenLastCalledWith(actorRun, {
			name: 'user: steered message',
			canonicalName: 'instance-ai.steered_message',
			runType: 'chain',
			tags: ['steered-message'],
			metadata: { queue_id: 'queue-1', message_id: 'msg-2' },
			inputs: recorded,
		});
		expect(finishRun).toHaveBeenCalledWith(actorRun, { outputs: recorded });

		await trace.finish({ status: 'completed' });
		expect(finishRun).toHaveBeenCalledWith(
			rootRun,
			expect.objectContaining({
				metadata: expect.objectContaining({ steered_message_count: 1 }),
			}),
		);
	});

	it('marks a task card from the Assistant tools as the first visible state', async () => {
		const { context, rootRun, finishRun } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());

		trace.observeChunk({ type: 'tool-call', toolCallId: 'tc-1', toolName: 'plan', input: {} });
		trace.observeEvent({
			type: 'tasks-update',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { tasks: { tasks: [] } },
		} as unknown as Parameters<AssistantTurnTrace['observeEvent']>[0]);
		await trace.finish({ status: 'completed' });

		expect(finishRun).toHaveBeenCalledWith(
			rootRun,
			expect.objectContaining({
				metadata: expect.objectContaining({ first_visible_state: 'task_card' }),
			}),
		);
	});

	it('records the error of a failed turn and finishes only once', async () => {
		const { context, rootRun, finishRun } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());

		await trace.finish({ status: 'errored', error: new Error('Model unavailable') });
		await trace.finish({ status: 'completed' });

		expect(finishRun).toHaveBeenCalledTimes(1);
		expect(finishRun).toHaveBeenCalledWith(
			rootRun,
			expect.objectContaining({
				error: 'Model unavailable',
				metadata: expect.objectContaining({ final_status: 'error' }),
			}),
		);
	});

	it('logs a trace that fails to finish, and still releases it', async () => {
		const { context, finishRun } = traceContext();
		finishRun.mockRejectedValue(new Error('Export failed'));
		const log = logger();
		const trace = new AssistantTurnTrace(context, 'run-1', log);

		await expect(trace.finish({ status: 'completed' })).resolves.toBeUndefined();

		expect(log.warn).toHaveBeenCalled();
		expect(releaseTraceClient).toHaveBeenCalledWith('ls-trace-1');
	});

	it('records the turn input build as a prompt span', async () => {
		const { context, actorRun, startChildRun, finishRun } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());

		const result = await trace.tracePromptBuild(
			{ message: 'Hi' },
			async () => ({ fullMessage: 'context + Hi' }),
			(built) => ({ fullMessage: built.fullMessage }),
		);

		expect(result).toEqual({ fullMessage: 'context + Hi' });
		expect(startChildRun).toHaveBeenCalledWith(
			context.messageRun,
			expect.objectContaining({ name: 'prepare: prompt' }),
		);
		expect(finishRun).toHaveBeenCalledWith(actorRun, {
			outputs: { fullMessage: 'context + Hi' },
			metadata: { final_status: 'completed' },
		});
	});
});

describe('AssistantTurnTracer', () => {
	const user = { id: 'user-1' } as SystemAgentStartTurn['user'];
	const thread = { id: 'thread-1' } as SystemAgentStartTurn['thread'];
	const setup = {
		runId: 'run-1',
		messageGroupId: 'mg-1',
		fileAttachments: [],
		contextAttachments: [],
	};
	const storedAnchor = {
		langsmithTraceId: 'ls-0',
		rootRunId: 'root-0',
		actorRunId: 'actor-0',
		otelTraceId: 'otel-0',
		actorSpanId: 'span-0',
	};

	function tracer() {
		const browserSessionService = mock<InstanceAiBrowserSessionService>();
		browserSessionService.getExtensionTraceContext.mockReturnValue({
			connectionState: 'disconnected',
		});
		return new AssistantTurnTracer(logger(), browserSessionService);
	}

	// Plain objects: a deep mock would add keys to the resume data that the tracer reads.
	function startTurn(): SystemAgentStartTurn {
		return {
			type: 'start',
			user,
			thread,
			message: 'Hi',
			emitHostEvent: vi.fn(),
		} as unknown as SystemAgentStartTurn;
	}

	function resumeTurn(overrides: Partial<SystemAgentResumeTurn> = {}): SystemAgentResumeTurn {
		return {
			type: 'resume',
			user,
			thread,
			runId: 'agent-run-1',
			toolCallId: 'tc-1',
			checkpointHostMetadata: { assistantTrace: storedAnchor },
			resumeData: { approved: true, userInput: 'Post it to #general' },
			emitHostEvent: vi.fn(),
			...overrides,
		} as unknown as SystemAgentResumeTurn;
	}

	it('starts a turn trace marked as an Assistant agent turn and sends its ids to the chat', async () => {
		const { context, startChildRun } = traceContext();
		vi.mocked(createInstanceAiTraceContext).mockResolvedValue(context);
		const turn = startTurn();

		const trace = await tracer().startForTurn(turn, {
			...setup,
			contextAttachments: [{ type: 'workflow', id: 'wf-1', name: 'Digest' }],
		});

		expect(trace?.context).toBe(context);
		expect(createInstanceAiTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				runId: 'run-1',
				messageGroupId: 'mg-1',
				userId: 'user-1',
				input: {
					message: 'Hi',
					resourceAttachments: [{ type: 'workflow', id: 'wf-1' }],
					messageGroupId: 'mg-1',
				},
				metadata: { assistant_runtime: 'agents' },
				browserExtension: { connectionState: 'disconnected' },
			}),
		);
		expect(turn.emitHostEvent).toHaveBeenCalledWith(ASSISTANT_TRACE_EVENT, trace?.payload, {
			key: 'turn',
		});
		await trace?.startOrchestratorRun();
		expect(startChildRun).toHaveBeenCalledWith(
			context.rootRun,
			expect.objectContaining({ inputs: { message: 'Hi' } }),
		);
	});

	it('closes the traces of running turns at shutdown, and only those', async () => {
		const running = traceContext();
		const settled = traceContext();
		vi.mocked(createInstanceAiTraceContext)
			.mockResolvedValueOnce(running.context)
			.mockResolvedValueOnce(settled.context);
		const instance = tracer();
		await instance.startForTurn(startTurn(), setup);
		const settledTrace = await instance.startForTurn(startTurn(), setup);
		await settledTrace?.finish({ status: 'completed' });
		settled.finishRun.mockClear();

		await instance.finishOpenTraces();

		expect(running.finishRun).toHaveBeenCalledWith(running.rootRun, {
			outputs: { status: 'cancelled', runId: 'run-1', reason: 'service_shutdown' },
			metadata: expect.objectContaining({
				final_status: 'cancelled',
				completion_source: 'service_cleanup',
			}),
		});
		// The user did not cancel the turn, so the root has no cancellation type.
		expect(running.finishRun).not.toHaveBeenCalledWith(
			running.rootRun,
			expect.objectContaining({
				metadata: expect.objectContaining({ cancellation_type: expect.anything() }),
			}),
		);
		expect(settled.finishRun).not.toHaveBeenCalled();

		// A trace closes once: a second shutdown call finds nothing open.
		running.finishRun.mockClear();
		await instance.finishOpenTraces();
		expect(running.finishRun).not.toHaveBeenCalled();
	});

	it('runs a turn that starts after shutdown began without a trace', async () => {
		const instance = tracer();
		await instance.finishOpenTraces();
		const turn = startTurn();

		await expect(instance.startForTurn(turn, setup)).resolves.toBeUndefined();

		expect(createInstanceAiTraceContext).not.toHaveBeenCalled();
		expect(turn.emitHostEvent).not.toHaveBeenCalled();
	});

	it('closes a trace that is created while shutdown runs', async () => {
		const { context, rootRun, finishRun } = traceContext();
		let createTrace!: (value: InstanceAiTraceContext) => void;
		vi.mocked(createInstanceAiTraceContext).mockReturnValue(
			new Promise((resolve) => {
				createTrace = resolve;
			}),
		);
		const instance = tracer();
		const turn = startTurn();
		const started = instance.startForTurn(turn, setup);

		await instance.finishOpenTraces();
		createTrace(context);

		await expect(started).resolves.toBeUndefined();
		expect(finishRun).toHaveBeenCalledWith(
			rootRun,
			expect.objectContaining({
				outputs: { status: 'cancelled', runId: 'run-1', reason: 'service_shutdown' },
				metadata: expect.objectContaining({ completion_source: 'service_cleanup' }),
			}),
		);
		expect(turn.emitHostEvent).not.toHaveBeenCalled();
	});

	it('links a card answer to the beat it continues, with the answer values', async () => {
		const { context } = traceContext();
		vi.mocked(continueInstanceAiTraceContext).mockResolvedValue(context);

		await tracer().startForTurn(resumeTurn(), setup);

		expect(createInstanceAiTraceContext).not.toHaveBeenCalled();
		expect(continueInstanceAiTraceContext).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({
				messageGroupId: 'mg-1',
				input: {
					toolCallId: 'tc-1',
					resumeFields: ['approved', 'userInput'],
					approved: true,
					userInput: 'Post it to #general',
				},
				metadata: expect.objectContaining({
					resume_reason: 'approval',
					continued_from_trace_id: 'otel-0',
					continued_from_run_id: 'root-0',
					resumed_from_span_id: 'span-0',
					resumed_from_activation_id: 'actor-0',
					pending_tool_call_id: 'tc-1',
					approved: true,
					assistant_runtime: 'agents',
				}),
			}),
		);
	});

	it('continues the message group of a stored anchor', async () => {
		const { context } = traceContext();
		vi.mocked(continueInstanceAiTraceContext).mockResolvedValue(context);

		await tracer().startForTurn(
			resumeTurn({
				checkpointHostMetadata: {
					assistantTrace: { ...storedAnchor, messageGroupId: 'mg_steered' },
				},
			}),
			setup,
		);

		expect(continueInstanceAiTraceContext).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({ messageGroupId: 'mg_steered' }),
		);
	});

	it('does not link a resume to a stored value that is not an anchor', async () => {
		const { context } = traceContext();
		vi.mocked(continueInstanceAiTraceContext).mockResolvedValue(context);

		await tracer().startForTurn(
			resumeTurn({ checkpointHostMetadata: { assistantTrace: { langsmithTraceId: 'ls' } } }),
			setup,
		);

		const [, options] = vi.mocked(continueInstanceAiTraceContext).mock.calls[0];
		expect(options.metadata).not.toHaveProperty('continued_from_run_id');
	});

	it('traces a message typed while a card waits as a new turn, like the current runtime', async () => {
		const { context, startChildRun } = traceContext();
		vi.mocked(createInstanceAiTraceContext).mockResolvedValue(context);

		const trace = await tracer().startForTurn(
			resumeTurn({
				resumeData: { _type: 'agent.cancellation', message: 'Use #general instead' },
			}),
			setup,
		);

		expect(continueInstanceAiTraceContext).not.toHaveBeenCalled();
		const [options] = vi.mocked(createInstanceAiTraceContext).mock.calls[0];
		// A message group of its own, so the trace shows a new user turn.
		expect(options.messageGroupId).toMatch(/^mg_/);
		expect(options.input).toEqual({
			message: 'Use #general instead',
			messageGroupId: options.messageGroupId,
		});
		expect(options.metadata).toEqual({
			cancelled_tool_call_id: 'tc-1',
			assistant_runtime: 'agents',
		});
		await trace?.startOrchestratorRun();
		expect(startChildRun).toHaveBeenCalledWith(
			context.rootRun,
			expect.objectContaining({ inputs: { message: 'Use #general instead' } }),
		);
	});

	it('runs the turn without a trace when creating it fails', async () => {
		vi.mocked(createInstanceAiTraceContext).mockRejectedValue(new Error('No exporter'));
		const turn = startTurn();

		await expect(tracer().startForTurn(turn, setup)).resolves.toBeUndefined();
		expect(turn.emitHostEvent).not.toHaveBeenCalled();
	});

	it('keeps the trace when the chat cannot take its ids', async () => {
		const { context } = traceContext();
		vi.mocked(createInstanceAiTraceContext).mockResolvedValue(context);
		const turn = startTurn();
		vi.mocked(turn.emitHostEvent).mockImplementation(() => {
			throw new Error('Channel closed');
		});

		await expect(tracer().startForTurn(turn, setup)).resolves.toBeInstanceOf(AssistantTurnTrace);
	});
});
