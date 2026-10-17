import type { AgentInputBoundary } from '@n8n/agents';
import type { TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AgentMessageSteeringService } from '../agent-message-steering.service';
import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentMessageQueue } from '../entities/agent-message-queue.entity';
import { ExecutionRecorder } from '../execution-recorder';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import type { AgentMessageRepository } from '../repositories/agent-message.repository';

function makeSteeredItem(overrides: {
	id: string;
	messageId: string;
	kind: 'preview' | 'n8n_chat';
	resourceId: string;
}): AgentMessageQueue {
	return mock<AgentMessageQueue>({
		id: overrides.id,
		messageId: overrides.messageId,
		payload: { kind: overrides.kind },
		message: mock<AgentMessageQueue['message']>({
			id: overrides.messageId,
			resourceId: overrides.resourceId,
			content: { role: 'user', content: [] },
			modelContent: null,
			author: null,
			createdAt: new Date('2026-01-01T00:00:00Z'),
		}),
	});
}

describe('AgentMessageSteeringService', () => {
	const txRunner = mock<TransactionRunner>();
	const queue = mock<AgentMessageQueueRepository>();
	const threads = mock<AgentExecutionThreadRepository>();
	const executions = mock<AgentExecutionRepository>();
	const messages = mock<AgentMessageRepository>();
	const checkpoints = mock<N8NCheckpointStorage>();
	const executionService = mock<AgentExecutionService>();
	const updates = mock<AgentExecutionUpdateBroadcaster>();

	let service: AgentMessageSteeringService;

	beforeEach(() => {
		vi.clearAllMocks();
		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		executionService.withTimelineWritesPaused.mockImplementation(
			async (_executionId, commit) => await commit(),
		);
		threads.lockById.mockResolvedValue(mock<AgentExecutionThread>({ id: 'thread-1' }));
		executions.updateTimelineIfRunning.mockResolvedValue(true);
		// The hot-path pre-check defaults to "something is queued" so existing
		// tests exercise the full locked path unless they say otherwise.
		queue.hasSteeringFor.mockResolvedValue(true);
		service = new AgentMessageSteeringService(
			txRunner,
			queue,
			threads,
			executions,
			messages,
			checkpoints,
			executionService,
			updates,
		);
	});

	const boundary: AgentInputBoundary = {
		messages: [],
		lastCreatedAt: 0,
		completing: false,
		canContinue: true,
	};

	it('consumes a queued n8n Chat item into the production memory resource id carried on the message', async () => {
		executions.findExecution.mockResolvedValue(
			mock<AgentExecution>({ threadId: 'thread-1', status: 'running', acceptsSteering: true }),
		);
		const item = makeSteeredItem({
			id: 'queue-1',
			messageId: 'message-1',
			kind: 'n8n_chat',
			resourceId: 'n8n_chat:user-1',
		});
		queue.findSteering.mockResolvedValue([item]);

		const recorder = new ExecutionRecorder();
		const result = await service.consume(
			{
				agentId: 'agent-1',
				projectId: 'project-1',
				threadId: 'thread-1',
				executionId: 'execution-1',
				resourceId: 'n8n_chat:user-1',
			},
			boundary,
			recorder,
			new AbortController().signal,
		);

		// The resource id comes from the running execution's own context, not a Preview-only helper.
		expect(messages.saveRuntimeMessages).toHaveBeenCalledWith(
			expect.objectContaining({ resourceId: 'n8n_chat:user-1' }),
			expect.anything(),
		);
		expect(queue.consumeSteering).toHaveBeenCalledWith(
			'thread-1',
			'execution-1',
			['queue-1'],
			expect.anything(),
		);
		expect(result.stopped).toBe(false);
	});

	it('does not consume input for an execution that does not accept steering', async () => {
		executions.findExecution.mockResolvedValue(
			mock<AgentExecution>({ threadId: 'thread-1', status: 'running', acceptsSteering: false }),
		);
		queue.findSteering.mockResolvedValue([
			makeSteeredItem({
				id: 'queue-1',
				messageId: 'message-1',
				kind: 'n8n_chat',
				resourceId: 'n8n_chat:user-1',
			}),
		]);

		const result = await service.consume(
			{
				agentId: 'agent-1',
				projectId: 'project-1',
				threadId: 'thread-1',
				executionId: 'execution-1',
				resourceId: 'n8n_chat:user-1',
			},
			boundary,
			new ExecutionRecorder(),
			new AbortController().signal,
		);

		expect(result).toEqual({ messages: [], events: [], stopped: true });
		expect(messages.saveRuntimeMessages).not.toHaveBeenCalled();
	});

	it('skips a queued item saved under a different resource id', async () => {
		executions.findExecution.mockResolvedValue(
			mock<AgentExecution>({ threadId: 'thread-1', status: 'running', acceptsSteering: true }),
		);
		queue.findSteering.mockResolvedValue([
			makeSteeredItem({
				id: 'queue-1',
				messageId: 'message-1',
				kind: 'n8n_chat',
				resourceId: 'n8n_chat:other-user',
			}),
		]);

		const result = await service.consume(
			{
				agentId: 'agent-1',
				projectId: 'project-1',
				threadId: 'thread-1',
				executionId: 'execution-1',
				resourceId: 'n8n_chat:user-1',
			},
			{ ...boundary, completing: true },
			new ExecutionRecorder(),
			new AbortController().signal,
		);

		expect(result).toEqual({ messages: [], events: [], stopped: false });
		expect(messages.saveRuntimeMessages).not.toHaveBeenCalled();
		expect(queue.consumeSteering).not.toHaveBeenCalled();
	});

	describe('hot-path pre-check', () => {
		it('does not open the transaction for an empty boundary with nothing queued', async () => {
			queue.hasSteeringFor.mockResolvedValue(false);
			executions.findExecution.mockResolvedValue(
				mock<AgentExecution>({ threadId: 'thread-1', status: 'running', acceptsSteering: true }),
			);

			const result = await service.consume(
				{
					agentId: 'agent-1',
					projectId: 'project-1',
					threadId: 'thread-1',
					executionId: 'execution-1',
					resourceId: 'n8n_chat:user-1',
				},
				boundary,
				new ExecutionRecorder(),
				new AbortController().signal,
			);

			expect(result).toEqual({ messages: [], events: [], stopped: false });
			expect(txRunner.run).not.toHaveBeenCalled();
			expect(threads.lockById).not.toHaveBeenCalled();
		});

		it('still stops a cancelled run on an empty boundary', async () => {
			// A cancel closes steering, so nothing stays queued; the boundary must still notice it.
			queue.hasSteeringFor.mockResolvedValue(false);
			executions.findExecution.mockResolvedValue(
				mock<AgentExecution>({ threadId: 'thread-1', status: 'running', acceptsSteering: false }),
			);

			const result = await service.consume(
				{
					agentId: 'agent-1',
					projectId: 'project-1',
					threadId: 'thread-1',
					executionId: 'execution-1',
					resourceId: 'n8n_chat:user-1',
				},
				boundary,
				new ExecutionRecorder(),
				new AbortController().signal,
			);

			expect(txRunner.run).toHaveBeenCalled();
			expect(result.stopped).toBe(true);
		});

		it('still throws on an empty boundary when the run lost ownership', async () => {
			queue.hasSteeringFor.mockResolvedValue(false);
			executions.findExecution.mockResolvedValue(
				mock<AgentExecution>({ threadId: 'thread-1', status: 'success', acceptsSteering: true }),
			);

			await expect(
				service.consume(
					{
						agentId: 'agent-1',
						projectId: 'project-1',
						threadId: 'thread-1',
						executionId: 'execution-1',
						resourceId: 'n8n_chat:user-1',
					},
					boundary,
					new ExecutionRecorder(),
					new AbortController().signal,
				),
			).rejects.toThrow('Agent execution ownership was lost');
		});

		it('still opens the transaction for a completing boundary with nothing queued', async () => {
			queue.hasSteeringFor.mockResolvedValue(false);
			executions.findExecution.mockResolvedValue(
				mock<AgentExecution>({ threadId: 'thread-1', status: 'running', acceptsSteering: true }),
			);
			queue.findSteering.mockResolvedValue([]);

			const result = await service.consume(
				{
					agentId: 'agent-1',
					projectId: 'project-1',
					threadId: 'thread-1',
					executionId: 'execution-1',
					resourceId: 'n8n_chat:user-1',
				},
				{ ...boundary, completing: true },
				new ExecutionRecorder(),
				new AbortController().signal,
			);

			expect(txRunner.run).toHaveBeenCalled();
			expect(executions.closeSteering).toHaveBeenCalledWith(
				'thread-1',
				'execution-1',
				expect.anything(),
			);
			expect(result).toEqual({ messages: [], events: [], stopped: false });
		});
	});
});
