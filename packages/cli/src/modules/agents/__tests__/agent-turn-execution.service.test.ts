import type { Agent as RuntimeAgent, StreamChunk } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

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
