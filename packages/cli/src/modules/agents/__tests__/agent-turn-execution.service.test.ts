import type { Agent as RuntimeAgent, SideCallUsageReport, StreamChunk } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { AgentKnowledgeUsageTracker } from '../agent-knowledge-usage-tracker';
import type { AgentChatExecutionService } from '../agent-chat-execution.service';
import type { AgentExecutionService, RecordMessageParams } from '../agent-execution.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentMessageSteeringService } from '../agent-message-steering.service';
import type { AgentToolApprovalService } from '../agent-tool-approval.service';
import { AgentTurnExecutionService, type AgentTurnRequest } from '../agent-turn-execution.service';
import type { ExecutionRecorder } from '../execution-recorder';
import type { AgentTurnFinalizeOutcome } from '../types/agent-turn-outcome';

it('ends a preview turn stopped during preparation without recording an error', async () => {
	const executions = mock<AgentExecutionService>();
	const chatExecutions = mock<AgentChatExecutionService>();
	chatExecutions.withTurnLock.mockImplementation(
		async (_threadId, action) => await action(new AbortController().signal),
	);
	const service = new AgentTurnExecutionService(
		mock<Logger>(),
		executions,
		chatExecutions,
		mock<AgentMessageQueueService>(),
		mock<AgentMessageSteeringService>(),
		mock<AgentToolApprovalService>(),
		mock<AgentKnowledgeUsageTracker>(),
	);
	const controller = new AbortController();
	const turn: AgentTurnRequest = {
		type: 'start',
		input: 'Continue',
		options: { abortSignal: controller.signal },
		recording: {
			projectId: 'project',
			agentId: 'agent',
			agentName: 'Agent',
			threadId: 'thread',
			resourceId: 'draft-chat:user',
			userMessage: 'Continue',
			source: 'chat',
			access: { accessScope: 'user', ownerId: 'user' },
		},
	};
	const chunks = [];
	for await (const chunk of service.execute({
		agentInstance: mock(),
		toolRegistry: new Map(),
		mcpServerAttributions: new Map(),
		context: turn.recording,
		chatSurface: 'preview',
		prepare: async () => {
			controller.abort();
			return turn;
		},
	}))
		chunks.push(chunk);
	expect(chunks).toEqual([]);
	expect(executions.startExecutionRecording).not.toHaveBeenCalled();
});

describe('onBeforeFinalize', () => {
	function streamOf(chunks: StreamChunk[]): ReadableStream<StreamChunk> {
		return new ReadableStream({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(chunk);
				controller.close();
			},
		});
	}

	/** Run one admitted turn that streams `chunks`, and return what the hook got. */
	async function runTurn(
		chunks: StreamChunk[],
		options: {
			abortController?: AbortController;
			onBeforeFinalize?: (outcome: AgentTurnFinalizeOutcome) => Promise<void>;
			onRecorderCreated?: (recorder: ExecutionRecorder) => void;
			beforeStream?: () => void;
		} = {},
	) {
		const executions = mock<AgentExecutionService>();
		executions.finalizeExecution.mockResolvedValue('exec-1');
		executions.getAbortSignal.mockReturnValue(new AbortController().signal);
		const service = new AgentTurnExecutionService(
			mock<Logger>(),
			executions,
			mock<AgentChatExecutionService>(),
			mock<AgentMessageQueueService>(),
			mock<AgentMessageSteeringService>(),
			mock<AgentToolApprovalService>(),
			mock<AgentKnowledgeUsageTracker>(),
		);
		const agentInstance = mock<RuntimeAgent>();
		agentInstance.stream.mockImplementation(async () => {
			options.beforeStream?.();
			return { stream: streamOf(chunks) } as never;
		});
		const abortController = options.abortController ?? new AbortController();
		const turn = {
			type: 'start',
			input: 'hello',
			options: { abortSignal: abortController.signal },
			recording: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		} as unknown as AgentTurnRequest;
		const onBeforeFinalize = vi.fn(options.onBeforeFinalize ?? (async () => {}));
		for await (const _chunk of service.execute({
			admittedExecution: { executionId: 'exec-1', startedAt: new Date(), inputMessageIds: [] },
			agentInstance,
			toolRegistry: new Map(),
			mcpServerAttributions: new Map(),
			context: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
			onBeforeFinalize,
			onRecorderCreated: options.onRecorderCreated,
			prepare: async () => turn,
		})) {
			// Read the stream to the end.
		}
		return { onBeforeFinalize, executions };
	}

	it('broadcasts server duration with each model turn before finalization', async () => {
		vi.useFakeTimers();
		const start = Date.parse('2026-10-26T10:00:00Z');
		vi.setSystemTime(start);
		try {
			const first = { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 };
			const second = { promptTokens: 20, completionTokens: 10, totalTokens: 30, cost: 0.02 };
			const { executions } = await runTurn(
				[
					{ type: 'usage', model: 'test-model', usage: first },
					{ type: 'usage', model: 'test-model', usage: second },
					{ type: 'finish', finishReason: 'stop', usage: second },
				],
				{ beforeStream: () => vi.setSystemTime(start + 2300) },
			);
			expect(executions.reportUsage.mock.calls).toEqual([
				[
					{
						projectId: 'project-1',
						agentId: 'agent-1',
						threadId: 'thread-1',
						executionId: 'exec-1',
					},
					first,
					2300,
				],
				[
					{
						projectId: 'project-1',
						agentId: 'agent-1',
						threadId: 'thread-1',
						executionId: 'exec-1',
					},
					second,
					2300,
				],
			]);
			expect(executions.reportUsage.mock.invocationCallOrder[1]).toBeLessThan(
				executions.finalizeExecution.mock.invocationCallOrder[0],
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('reports a completed turn once, before the record is stored', async () => {
		const { onBeforeFinalize, executions } = await runTurn([
			{ type: 'text-delta', id: 't-1', delta: 'Hello' },
			{ type: 'finish', finishReason: 'stop' },
		]);

		expect(onBeforeFinalize).toHaveBeenCalledTimes(1);
		expect(onBeforeFinalize).toHaveBeenCalledWith({ executionId: 'exec-1', status: 'completed' });
		const [hookCall] = onBeforeFinalize.mock.invocationCallOrder;
		const [finalizeCall] = executions.finalizeExecution.mock.invocationCallOrder;
		expect(hookCall).toBeLessThan(finalizeCall);
	});

	it('stores events that the hook records with the turn', async () => {
		let recorder: ExecutionRecorder | undefined;
		const { executions } = await runTurn(
			[
				{ type: 'text-delta', id: 't-1', delta: 'Hello' },
				{ type: 'finish', finishReason: 'stop' },
			],
			{
				onRecorderCreated: (created) => {
					recorder = created;
				},
				onBeforeFinalize: async () => {
					recorder?.recordHostEvent('test.summary', { ok: true });
				},
			},
		);

		const params = executions.finalizeExecution.mock.calls[0][1] as RecordMessageParams;
		expect(params.record.timeline.map((event) => event.type)).toEqual(['text', 'host-event']);
	});

	it('reports an errored turn with the error that the stream reported', async () => {
		const failure = new Error('model failed');
		const { onBeforeFinalize } = await runTurn([
			{ type: 'error', error: failure },
			{ type: 'finish', finishReason: 'error' },
		]);

		// The same error object, not a copy or a normalized message.
		expect(onBeforeFinalize).toHaveBeenCalledWith({
			executionId: 'exec-1',
			status: 'errored',
			error: failure,
		});
	});

	it('reports a cancelled turn', async () => {
		const abortController = new AbortController();
		const { onBeforeFinalize } = await runTurn([], {
			abortController,
			beforeStream: () => abortController.abort(),
		});

		expect(onBeforeFinalize).toHaveBeenCalledWith({ executionId: 'exec-1', status: 'cancelled' });
	});

	it('stores the turn when the hook fails', async () => {
		const { executions } = await runTurn([{ type: 'finish', finishReason: 'stop' }], {
			onBeforeFinalize: async () => {
				throw new Error('hook failed');
			},
		});

		expect(executions.finalizeExecution).toHaveBeenCalledTimes(1);
	});
});

describe('onSideCallUsage', () => {
	const report: SideCallUsageReport = {
		task: 'observer',
		model: 'anthropic/claude-haiku-5-5',
		usage: { promptTokens: 1200, completionTokens: 80, totalTokens: 1280 },
		cost: 0.0021,
		reportId: 'report-1',
	};

	/**
	 * Run one admitted turn. The fake runtime reports one side call while the
	 * turn runs, through the callback that the host passes to the SDK.
	 */
	async function runTurn(
		type: 'start' | 'resume',
		callerOnSideCallUsage?: (report: SideCallUsageReport) => void | Promise<void>,
	) {
		const logger = mock<Logger>();
		const executions = mock<AgentExecutionService>();
		executions.finalizeExecution.mockResolvedValue('exec-1');
		executions.getAbortSignal.mockReturnValue(new AbortController().signal);
		executions.recordSideCallUsage.mockResolvedValue();
		const service = new AgentTurnExecutionService(
			logger,
			executions,
			mock<AgentChatExecutionService>(),
			mock<AgentMessageQueueService>(),
			mock<AgentMessageSteeringService>(),
			mock<AgentToolApprovalService>(),
			mock<AgentKnowledgeUsageTracker>(),
		);
		const emptyStream = () =>
			new ReadableStream<StreamChunk>({
				start(controller) {
					controller.enqueue({ type: 'finish', finishReason: 'stop' });
					controller.close();
				},
			});
		const agentInstance = mock<RuntimeAgent>();
		// The outcome of what the SDK awaits after it reports the side call.
		let delivered: Promise<{ error?: unknown }> = Promise.resolve({});
		const reportSideCall = (options: { onSideCallUsage?: (r: SideCallUsageReport) => unknown }) => {
			delivered = Promise.resolve(options.onSideCallUsage?.(report)).then(
				() => ({}),
				(error: unknown) => ({ error }),
			);
		};
		agentInstance.stream.mockImplementation(async (_input, options) => {
			reportSideCall(options ?? {});
			return { stream: emptyStream() } as never;
		});
		agentInstance.resume.mockImplementation(async (_mode, _data, options) => {
			reportSideCall(options ?? {});
			return { stream: emptyStream() } as never;
		});
		const options = {
			abortSignal: new AbortController().signal,
			...(callerOnSideCallUsage ? { onSideCallUsage: callerOnSideCallUsage } : {}),
		};
		const recording = { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' };
		const turn = (type === 'start'
			? { type, input: 'hello', options, recording }
			: {
					type,
					resumeData: {},
					options: { ...options, runId: 'run-1', toolCallId: 'tc-1' },
					recording,
				}) as unknown as AgentTurnRequest;
		for await (const _chunk of service.execute({
			admittedExecution: { executionId: 'exec-1', startedAt: new Date(), inputMessageIds: [] },
			agentInstance,
			toolRegistry: new Map(),
			mcpServerAttributions: new Map(),
			context: recording,
			prepare: async () => turn,
		})) {
			// Read the stream to the end.
		}
		return { executions, delivered };
	}

	it.each(['start', 'resume'] as const)(
		'records the cost and forwards the report to the caller on a %s turn',
		async (type) => {
			const callerOnSideCallUsage = vi.fn();

			const { executions } = await runTurn(type, callerOnSideCallUsage);

			expect(executions.recordSideCallUsage).toHaveBeenCalledWith('exec-1', 'thread-1', report);
			expect(callerOnSideCallUsage).toHaveBeenCalledTimes(1);
			expect(callerOnSideCallUsage).toHaveBeenCalledWith(report);
		},
	);

	it('records the cost when the caller passes no callback', async () => {
		const { executions } = await runTurn('start');

		expect(executions.recordSideCallUsage).toHaveBeenCalledWith('exec-1', 'thread-1', report);
	});

	it('returns the caller callback promise to the SDK', async () => {
		let finishClaim!: () => void;
		const callerOnSideCallUsage = vi.fn(
			async () => await new Promise<void>((resolve) => (finishClaim = resolve)),
		);
		let settled = false;

		const { delivered } = await runTurn('start', callerOnSideCallUsage);
		void delivered.then(() => (settled = true));
		await new Promise((resolve) => setImmediate(resolve));

		expect(settled).toBe(false);
		finishClaim();
		await delivered;
		expect(settled).toBe(true);
	});

	it.each([
		[
			'throws',
			() => {
				throw new Error('claim failed');
			},
		],
		['rejects', async () => await Promise.reject(new Error('claim failed'))],
	])(
		'records the cost and passes the error to the SDK when the caller callback %s',
		async (_, onUsage) => {
			const { executions, delivered } = await runTurn('start', onUsage);

			expect(executions.recordSideCallUsage).toHaveBeenCalledWith('exec-1', 'thread-1', report);
			expect(executions.finalizeExecution).toHaveBeenCalled();
			expect((await delivered).error).toEqual(new Error('claim failed'));
		},
	);
});
