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

import type { InstanceAiBrowserSessionService } from '../../browser/instance-ai-browser-session.service';
import {
	AssistantTurnTrace,
	AssistantTurnTracer,
	readAssistantTraceAnchor,
} from '../assistant-turn-trace';

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
	} as unknown as InstanceAiTraceContext;
	return { context, rootRun, actorRun, startChildRun, finishRun, withActiveSpan };
}

function logger() {
	const log = mock<Logger>();
	log.scoped.mockReturnValue(log);
	return log;
}

describe('AssistantTurnTrace', () => {
	it('gives the trace ids for the chat and the anchor for a resume', async () => {
		const { context, startChildRun } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());

		await trace.startOrchestratorRun({ message: 'Hi' });

		expect(startChildRun).toHaveBeenCalledWith(
			context.rootRun,
			expect.objectContaining({
				name: 'agent: orchestrator',
				metadata: expect.objectContaining({ agent_role: 'orchestrator' }),
			}),
		);
		expect(trace.payload).toEqual({
			traceId: 'otel-1',
			langsmithTraceId: 'ls-trace-1',
			langsmithRunId: 'root-1',
		});
		expect(trace.anchor()).toEqual({
			langsmithTraceId: 'ls-trace-1',
			rootRunId: 'root-1',
			actorRunId: 'actor-1',
			otelTraceId: 'otel-1',
			actorSpanId: 'span-1',
			messageGroupId: 'mg-1',
		});
	});

	it('runs the turn with the orchestrator span active', async () => {
		const { context, actorRun, withActiveSpan } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());
		await trace.startOrchestratorRun({});

		await expect(trace.withContext(async () => 'done')).resolves.toBe('done');

		expect(withActiveSpan).toHaveBeenCalledWith(actorRun, expect.any(Function));
	});

	it('finishes a completed turn with its reply and the run metadata', async () => {
		const { context, rootRun, actorRun, finishRun } = traceContext();
		const trace = new AssistantTurnTrace(context, 'run-1', logger());
		await trace.startOrchestratorRun({});

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
		await trace.startOrchestratorRun({});

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

describe('readAssistantTraceAnchor', () => {
	it('reads a stored anchor and refuses other values', () => {
		expect(
			readAssistantTraceAnchor({ langsmithTraceId: 'ls', rootRunId: 'root', actorRunId: 'actor' }),
		).toEqual({ langsmithTraceId: 'ls', rootRunId: 'root', actorRunId: 'actor' });
		expect(
			readAssistantTraceAnchor({
				langsmithTraceId: 'ls',
				rootRunId: 'root',
				actorRunId: 'actor',
				messageGroupId: 'mg-2',
			}),
		).toMatchObject({ messageGroupId: 'mg-2' });
		expect(readAssistantTraceAnchor({ langsmithTraceId: 'ls' })).toBeUndefined();
		expect(readAssistantTraceAnchor(null)).toBeUndefined();
	});
});

describe('AssistantTurnTracer', () => {
	const scope = {
		threadId: 'thread-1',
		runId: 'run-1',
		messageGroupId: 'mg-1',
		userId: 'user-1',
	};

	function tracer() {
		const browserSessionService = mock<InstanceAiBrowserSessionService>();
		browserSessionService.getExtensionTraceContext.mockReturnValue({
			connectionState: 'disconnected',
		});
		return new AssistantTurnTracer(logger(), browserSessionService);
	}

	it('starts a turn trace marked as an Assistant agent turn', async () => {
		const { context } = traceContext();
		vi.mocked(createInstanceAiTraceContext).mockResolvedValue(context);

		const trace = await tracer().startTurn(scope, { message: 'Hi' });

		expect(trace?.context).toBe(context);
		expect(createInstanceAiTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				runId: 'run-1',
				messageGroupId: 'mg-1',
				userId: 'user-1',
				input: { message: 'Hi' },
				metadata: { assistant_runtime: 'agents' },
				browserExtension: { connectionState: 'disconnected' },
			}),
		);
	});

	it('links a resume to the beat it continues', async () => {
		const { context } = traceContext();
		vi.mocked(continueInstanceAiTraceContext).mockResolvedValue(context);

		await tracer().resumeTurn(
			scope,
			{ toolCallId: 'tc-1' },
			{
				anchor: {
					langsmithTraceId: 'ls-0',
					rootRunId: 'root-0',
					actorRunId: 'actor-0',
					otelTraceId: 'otel-0',
					actorSpanId: 'span-0',
				},
				metadata: { pending_tool_call_id: 'tc-1' },
			},
		);

		expect(continueInstanceAiTraceContext).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({
				messageGroupId: 'mg-1',
				input: { toolCallId: 'tc-1' },
				metadata: expect.objectContaining({
					resume_reason: 'approval',
					continued_from_trace_id: 'otel-0',
					continued_from_run_id: 'root-0',
					resumed_from_span_id: 'span-0',
					resumed_from_activation_id: 'actor-0',
					pending_tool_call_id: 'tc-1',
					assistant_runtime: 'agents',
				}),
			}),
		);
	});

	it('runs the turn without a trace when creating it fails', async () => {
		vi.mocked(createInstanceAiTraceContext).mockRejectedValue(new Error('No exporter'));

		await expect(tracer().startTurn(scope, { message: 'Hi' })).resolves.toBeUndefined();
	});
});
