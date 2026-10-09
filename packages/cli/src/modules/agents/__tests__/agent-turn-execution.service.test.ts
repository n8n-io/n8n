import type { Agent as RuntimeAgent, StreamChunk } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import type { AgentChatExecutionService } from '../agent-chat-execution.service';
import type { AgentExecutionService, RecordMessageParams } from '../agent-execution.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentMessageSteeringService } from '../agent-message-steering.service';
import type { AgentToolApprovalService } from '../agent-tool-approval.service';
import {
	AgentTurnExecutionService,
	type AgentTurnFinalizeOutcome,
	type AgentTurnRequest,
} from '../agent-turn-execution.service';
import type { ExecutionRecorder } from '../execution-recorder';

function streamOf(chunks: StreamChunk[]): ReadableStream<StreamChunk> {
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		},
	});
}

function setup(chunks: StreamChunk[], abortController = new AbortController()) {
	const executionService = mock<AgentExecutionService>();
	executionService.getAbortSignal.mockReturnValue(new AbortController().signal);
	executionService.finalizeExecution.mockResolvedValue('exec-1');
	const service = new AgentTurnExecutionService(
		mockLogger(),
		executionService,
		mock<AgentChatExecutionService>(),
		mock<AgentMessageQueueService>(),
		mock<AgentMessageSteeringService>(),
		mock<AgentToolApprovalService>(),
	);
	const agentInstance = mock<RuntimeAgent>();
	agentInstance.stream.mockResolvedValue({ stream: streamOf(chunks) } as never);
	const turn = {
		type: 'start',
		input: 'hello',
		options: { abortSignal: abortController.signal },
		recording: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
	} as unknown as AgentTurnRequest;
	return { service, executionService, agentInstance, turn };
}

async function drain(stream: AsyncGenerator<unknown>) {
	for await (const _chunk of stream) {
		// Read the stream to the end.
	}
}

function storedRecord(executionService: ReturnType<typeof setup>['executionService']) {
	const params = executionService.finalizeExecution.mock.calls[0][1] as RecordMessageParams;
	return params.record;
}

describe('AgentTurnExecutionService', () => {
	describe('onBeforeFinalize', () => {
		const textChunks: StreamChunk[] = [
			{ type: 'text-delta', id: 't-1', delta: 'Hello' },
			{ type: 'finish', finishReason: 'stop' },
		];

		it('stores events that the hook records, with the outcome of the turn', async () => {
			const { service, executionService, agentInstance, turn } = setup(textChunks);
			let recorder: ExecutionRecorder | undefined;
			const onBeforeFinalize = vi.fn(async () => {
				recorder?.recordHostEvent('test.summary', { ok: true });
			});

			await drain(
				service.execute({
					admittedExecution: {
						executionId: 'exec-1',
						startedAt: new Date(),
						inputMessageIds: [],
					},
					agentInstance,
					toolRegistry: new Map(),
					mcpServerAttributions: new Map(),
					context: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
					onRecorderCreated: (created) => {
						recorder = created;
					},
					onBeforeFinalize,
					prepare: async () => turn,
				}),
			);

			expect(onBeforeFinalize).toHaveBeenCalledWith({
				executionId: 'exec-1',
				status: 'completed',
			} satisfies AgentTurnFinalizeOutcome);
			expect(storedRecord(executionService).timeline.map((event) => event.type)).toEqual([
				'text',
				'host-event',
			]);
		});

		it('reports an errored turn', async () => {
			const error = new Error('model failed');
			const { service, agentInstance, turn } = setup([
				{ type: 'error', error },
				{ type: 'finish', finishReason: 'error' },
			]);
			const onBeforeFinalize = vi.fn(async () => {});

			await drain(
				service.execute({
					admittedExecution: { executionId: 'exec-1', startedAt: new Date(), inputMessageIds: [] },
					agentInstance,
					toolRegistry: new Map(),
					mcpServerAttributions: new Map(),
					context: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
					onBeforeFinalize,
					prepare: async () => turn,
				}),
			);

			expect(onBeforeFinalize).toHaveBeenCalledWith({
				executionId: 'exec-1',
				status: 'errored',
				error,
			});
		});

		it('reports a cancelled turn', async () => {
			const abortController = new AbortController();
			const { service, agentInstance, turn } = setup([], abortController);
			agentInstance.stream.mockImplementation(async () => {
				abortController.abort();
				return { stream: streamOf([]) } as never;
			});
			const onBeforeFinalize = vi.fn(async () => {});

			await drain(
				service.execute({
					admittedExecution: { executionId: 'exec-1', startedAt: new Date(), inputMessageIds: [] },
					agentInstance,
					toolRegistry: new Map(),
					mcpServerAttributions: new Map(),
					context: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
					onBeforeFinalize,
					prepare: async () => turn,
				}),
			);

			expect(onBeforeFinalize).toHaveBeenCalledWith({ executionId: 'exec-1', status: 'cancelled' });
		});

		it('stores the turn when the hook fails', async () => {
			const { service, executionService, agentInstance, turn } = setup(textChunks);

			await drain(
				service.execute({
					admittedExecution: { executionId: 'exec-1', startedAt: new Date(), inputMessageIds: [] },
					agentInstance,
					toolRegistry: new Map(),
					mcpServerAttributions: new Map(),
					context: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
					onBeforeFinalize: async () => {
						throw new Error('hook failed');
					},
					prepare: async () => turn,
				}),
			);

			expect(executionService.finalizeExecution).toHaveBeenCalledTimes(1);
		});
	});
});
