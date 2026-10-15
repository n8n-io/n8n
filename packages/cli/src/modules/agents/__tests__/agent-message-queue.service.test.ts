import type { TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@n8n/errors';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentMessageSteeringService } from '../agent-message-steering.service';
import type { AgentsSettingsService } from '../agents-settings.service';
import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentMessageQueue } from '../entities/agent-message-queue.entity';
import { N8N_CHAT_PRODUCTION_SOURCE } from '../utils/agent-thread-access';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import type { AgentMessageRepository } from '../repositories/agent-message.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import { SystemAgentRegistry } from '../system-agents/system-agent-registry';

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return mock<AgentExecutionThread>({
		id: 'thread-1',
		projectId: 'project-1',
		agentId: 'agent-1',
		accessScope: 'user',
		ownerId: 'user-1',
		parentThreadId: null,
		taskId: null,
		...overrides,
	});
}

describe('AgentMessageQueueService', () => {
	const txRunner = mock<TransactionRunner>();
	const repository = mock<AgentMessageQueueRepository>();
	const threadRepository = mock<AgentExecutionThreadRepository>();
	const executionRepository = mock<AgentExecutionRepository>();
	const executionService = mock<AgentExecutionService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const agentRepository = mock<AgentRepository>();
	const attachments = mock<AgentChatAttachmentService>();
	const updates = mock<AgentExecutionUpdateBroadcaster>();
	const messages = mock<AgentMessageRepository>();
	const steering = mock<AgentMessageSteeringService>();
	const settingsService = mock<AgentsSettingsService>();

	let service: AgentMessageQueueService;

	beforeEach(() => {
		vi.clearAllMocks();
		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		executionRepository.findFirstSourceByThreadIds.mockResolvedValue(
			new Map([['thread-1', N8N_CHAT_PRODUCTION_SOURCE]]),
		);
		service = new AgentMessageQueueService(
			txRunner,
			repository,
			threadRepository,
			executionRepository,
			executionService,
			checkpointStorage,
			agentRepository,
			attachments,
			updates,
			messages,
			steering,
			settingsService,
			new SystemAgentRegistry(),
		);
	});

	describe('listPending', () => {
		it.each(['preview', 'n8n_chat'] as const)(
			'reports the steerable execution for a %s thread',
			async (kind) => {
				threadRepository.findOneBy.mockResolvedValue(makeThread());
				repository.listPending.mockResolvedValue([]);
				steering.findEligible.mockResolvedValue(mock<AgentExecution>({ id: 'execution-1' }));
				// Preview threads reach `assertUserChatAccess` through the 'chat' source.
				if (kind === 'preview') {
					executionRepository.findFirstSourceByThreadIds.mockResolvedValue(
						new Map([['thread-1', 'chat']]),
					);
				}

				const result = await service.listPending({
					projectId: 'project-1',
					agentId: 'agent-1',
					threadId: 'thread-1',
					userId: 'user-1',
					kind,
				});

				expect(result.steerableExecutionId).toBe('execution-1');
			},
		);

		it('does not look up a steerable execution for an empty thread', async () => {
			threadRepository.findOneBy.mockResolvedValue(null);

			const result = await service.listPending({
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
				userId: 'user-1',
				kind: 'n8n_chat',
			});

			expect(result).toEqual({ items: [], steerableExecutionId: null });
			expect(steering.findEligible).not.toHaveBeenCalled();
		});
	});

	describe('reorderPending', () => {
		it.each(['preview', 'n8n_chat'] as const)('reorders items of kind %s', async (kind) => {
			threadRepository.lockById.mockResolvedValue(
				makeThread({
					parentThreadId: null,
				}),
			);
			executionRepository.findFirstSourceByThreadIds.mockResolvedValue(
				new Map([['thread-1', kind === 'preview' ? 'chat' : N8N_CHAT_PRODUCTION_SOURCE]]),
			);
			repository.movePending.mockResolvedValue(true);

			await service.reorderPending({
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
				userId: 'user-1',
				queueId: '1',
				targetQueueId: '2',
				expectedQueueIds: ['1', '2'],
				kind,
			});

			expect(repository.movePending).toHaveBeenCalledWith(
				'thread-1',
				'1',
				'2',
				['1', '2'],
				kind,
				expect.anything(),
			);
			expect(updates.notifyQueueUpdated).toHaveBeenCalledWith('thread-1');
		});

		it('rejects when the repository reports the range has changed (e.g. a mixed-kind range)', async () => {
			threadRepository.lockById.mockResolvedValue(makeThread());
			executionRepository.findFirstSourceByThreadIds.mockResolvedValue(
				new Map([['thread-1', N8N_CHAT_PRODUCTION_SOURCE]]),
			);
			repository.movePending.mockResolvedValue(false);

			await expect(
				service.reorderPending({
					projectId: 'project-1',
					agentId: 'agent-1',
					threadId: 'thread-1',
					userId: 'user-1',
					queueId: '1',
					targetQueueId: '2',
					expectedQueueIds: ['1', '2'],
					kind: 'n8n_chat',
				}),
			).rejects.toThrow(ConflictError);
		});
	});

	describe('steer', () => {
		it.each(['preview', 'n8n_chat'] as const)('accepts a queued item of kind %s', async (kind) => {
			threadRepository.lockById.mockResolvedValue(makeThread());
			executionRepository.findFirstSourceByThreadIds.mockResolvedValue(
				new Map([['thread-1', kind === 'preview' ? 'chat' : N8N_CHAT_PRODUCTION_SOURCE]]),
			);
			repository.findItem.mockResolvedValue(
				mock<AgentMessageQueue>({
					id: '1',
					payload: { kind },
					executionId: null,
					steeringExecutionId: null,
				}),
			);
			steering.findEligible.mockResolvedValue(mock<AgentExecution>({ id: 'execution-1' }));
			repository.reserveSteering.mockResolvedValue(true);

			await service.steer({
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
				userId: 'user-1',
				queueId: '1',
				executionId: 'execution-1',
				kind,
			});

			expect(repository.reserveSteering).toHaveBeenCalledWith(
				'thread-1',
				'1',
				'execution-1',
				expect.anything(),
			);
		});

		it('rejects an item whose kind does not match the request (e.g. an integration item)', async () => {
			threadRepository.lockById.mockResolvedValue(makeThread());
			executionRepository.findFirstSourceByThreadIds.mockResolvedValue(
				new Map([['thread-1', N8N_CHAT_PRODUCTION_SOURCE]]),
			);
			repository.findItem.mockResolvedValue(
				mock<AgentMessageQueue>({
					id: '1',
					payload: { kind: 'integration' } as unknown as AgentMessageQueue['payload'],
					executionId: null,
					steeringExecutionId: null,
				}),
			);

			await expect(
				service.steer({
					projectId: 'project-1',
					agentId: 'agent-1',
					threadId: 'thread-1',
					userId: 'user-1',
					queueId: '1',
					executionId: 'execution-1',
					kind: 'n8n_chat',
				}),
			).rejects.toThrow(ConflictError);
			expect(repository.reserveSteering).not.toHaveBeenCalled();
		});
	});
});
