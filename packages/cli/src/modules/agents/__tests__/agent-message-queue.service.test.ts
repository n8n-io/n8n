import type { TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@n8n/errors';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentMessageSteeringService } from '../agent-message-steering.service';
import type { AgentsSettingsService } from '../agents-settings.service';
import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentExecutionService } from '../agent-execution.service';
import type { ProjectAgent } from '../entities/agent.entity';
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
import type { SystemAgentProvider } from '../system-agents/system-agent.types';
import { SYSTEM_CHAT_SOURCE } from '../utils/agent-thread-access';

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

	let systemAgents: SystemAgentRegistry;
	let service: AgentMessageQueueService;

	beforeEach(() => {
		vi.clearAllMocks();
		systemAgents = new SystemAgentRegistry();
		// The real policy: the setting covers every agent except a registered system agent.
		settingsService.appliesTo.mockImplementation((agentId) => !systemAgents.has(agentId));
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
			systemAgents,
		);
	});

	describe('claimNext', () => {
		it('reads the Agents setting before it locks the thread', async () => {
			settingsService.getEnabled.mockResolvedValue(true);
			threadRepository.lockById.mockResolvedValue(null);

			await service.claimNext('thread-1', async () => true);

			// Disabling Agents locks the setting and then the threads. The same order prevents a deadlock.
			const [settingsCall] = settingsService.getEnabled.mock.invocationCallOrder;
			const [lockCall] = threadRepository.lockById.mock.invocationCallOrder;
			expect(settingsCall).toBeLessThan(lockCall);
		});

		it('does not claim a project agent thread while Agents are turned off', async () => {
			settingsService.getEnabled.mockResolvedValue(false);
			threadRepository.lockById.mockResolvedValue(makeThread());

			expect(await service.claimNext('thread-1', async () => true)).toBeNull();
			expect(steering.releaseInactive).not.toHaveBeenCalled();
		});

		it('keeps claiming a system agent thread while Agents are turned off', async () => {
			systemAgents.register(mock<SystemAgentProvider>({ agentId: 'system-agent' }));
			settingsService.getEnabled.mockResolvedValue(false);
			threadRepository.lockById.mockResolvedValue(makeThread({ agentId: 'system-agent' }));
			steering.releaseInactive.mockResolvedValue(false);
			executionRepository.existsRunningByThread.mockResolvedValue(true);

			// A running turn blocks the claim, but only after the setting check let the thread through.
			expect(await service.claimNext('thread-1', async () => true)).toBeNull();
			expect(steering.releaseInactive).toHaveBeenCalled();
		});
	});

	describe('integration messages', () => {
		it('stores the typed platform context on the origin, outside the dispatch', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(mock<ProjectAgent>({ name: 'Agent' }));
			messages.createInput.mockResolvedValue(mock({ id: 'message-1' }));
			repository.enqueue.mockResolvedValue(mock<AgentMessageQueue>({ threadId: 'thread-1' }));
			const integrationOrigin = {
				type: 'slack' as const,
				workspaceId: 'T1',
				conversationKind: 'channel' as const,
				channelId: 'C1',
			};

			await service.enqueue({
				agentId: 'agent-1',
				projectId: 'project-1',
				threadId: 'thread-1',
				sessionMode: 'new',
				source: 'slack',
				payload: {
					kind: 'integration',
					message: 'hello',
					modelMessage: 'hello',
					resourceId: 'resource-1',
					credentialId: 'credential-1',
					platformThreadId: 'slack:C1:1.2',
					author: { id: 'U1', name: 'Alice' },
					integrationOrigin,
					sender: { userId: 'U1', userName: 'alice', fullName: 'Alice', isBot: false, isMe: false },
					messageContext: {
						integrationConnectionId: 'connection-1',
						platform: 'slack',
						messageId: 'platform-message-1',
						target: { type: 'thread', threadId: 'slack:C1:1.2' },
						updatedAt: '2026-10-21T00:00:00.000Z',
					},
					contextConversation: { threadId: 'thread-1', resourceId: 'U1' },
				},
			});

			expect(messages.createInput).toHaveBeenCalledWith(
				expect.objectContaining({
					origin: {
						source: 'slack',
						integrationConnectionId: 'connection-1',
						platformMessageId: 'platform-message-1',
						platformThreadId: 'slack:C1:1.2',
						integration: integrationOrigin,
					},
				}),
				expect.anything(),
			);
			expect(repository.enqueue).toHaveBeenCalledWith(
				'thread-1',
				'message-1',
				expect.not.objectContaining({ integrationOrigin }),
				expect.anything(),
			);
		});
	});

	describe('episodic scope', () => {
		it.each([
			['a resolved scope', { writeScopeId: 'slack:T1:C1', readScopeIds: ['slack:T1:C1'] }],
			['a disabled marker', { disabled: true as const }],
		])('keeps %s in the dispatch', async (_label, episodicScope) => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(mock<ProjectAgent>({ name: 'Agent' }));
			messages.createInput.mockResolvedValue(mock({ id: 'message-1' }));
			repository.enqueue.mockResolvedValue(mock<AgentMessageQueue>({ threadId: 'thread-1' }));

			await service.enqueue({
				agentId: 'agent-1',
				projectId: 'project-1',
				threadId: 'thread-1',
				sessionMode: 'new',
				source: 'slack',
				payload: {
					kind: 'integration',
					message: 'hello',
					modelMessage: 'hello',
					resourceId: 'resource-1',
					credentialId: 'credential-1',
					platformThreadId: 'slack:C1:1.2',
					author: { id: 'U1', name: 'Alice' },
					episodicScope,
					sender: { userId: 'U1', userName: 'alice', fullName: 'Alice', isBot: false, isMe: false },
					messageContext: {
						integrationConnectionId: 'connection-1',
						platform: 'slack',
						messageId: 'platform-message-1',
						target: { type: 'thread', threadId: 'slack:C1:1.2' },
						updatedAt: '2026-10-21T00:00:00.000Z',
					},
					contextConversation: { threadId: 'thread-1', resourceId: 'U1' },
				},
			});

			expect(repository.enqueue).toHaveBeenCalledWith(
				'thread-1',
				'message-1',
				expect.objectContaining({ episodicScope }),
				expect.anything(),
			);
		});
	});

	describe('hidden system turns', () => {
		const systemThread = () => makeThread({ agentId: 'system-agent' });

		function queuedItem(id: string, hidden: boolean): AgentMessageQueue {
			return mock<AgentMessageQueue>({
				id,
				payload: { kind: 'system' },
				steeringOrder: null,
				steeringExecutionId: null,
				createdAt: new Date('2026-10-19T00:00:00Z'),
				message: {
					content: { role: 'user', content: [{ type: 'text', text: id }] },
					origin: hidden
						? { source: SYSTEM_CHAT_SOURCE, hidden: true }
						: { source: SYSTEM_CHAT_SOURCE },
				},
			});
		}

		beforeEach(() => {
			systemAgents.register(
				mock<SystemAgentProvider>({ agentId: 'system-agent', name: 'System agent' }),
			);
			executionRepository.findFirstSourceByThreadIds.mockResolvedValue(
				new Map([['thread-1', SYSTEM_CHAT_SOURCE]]),
			);
		});

		it('stores a hidden message with a hidden origin, outside the dispatch', async () => {
			messages.createInput.mockResolvedValue(mock({ id: 'message-1' }));
			repository.enqueue.mockResolvedValue(mock<AgentMessageQueue>({ threadId: 'thread-1' }));

			await service.enqueue({
				agentId: 'system-agent',
				projectId: 'project-1',
				threadId: 'thread-1',
				sessionMode: 'existing',
				source: SYSTEM_CHAT_SOURCE,
				payload: {
					kind: 'system',
					userId: 'user-1',
					message: 'Continue the build',
					resourceId: 'system-chat:user-1',
					options: { followUp: true },
					hidden: true,
				},
			});

			expect(messages.createInput).toHaveBeenCalledWith(
				expect.objectContaining({ origin: { source: SYSTEM_CHAT_SOURCE, hidden: true } }),
				expect.anything(),
			);
			expect(repository.enqueue).toHaveBeenCalledWith(
				'thread-1',
				'message-1',
				{ kind: 'system', options: { followUp: true } },
				expect.anything(),
			);
		});

		it('stores a visible message without a hidden origin', async () => {
			messages.createInput.mockResolvedValue(mock({ id: 'message-1' }));
			repository.enqueue.mockResolvedValue(mock<AgentMessageQueue>({ threadId: 'thread-1' }));

			await service.enqueue({
				agentId: 'system-agent',
				projectId: 'project-1',
				threadId: 'thread-1',
				sessionMode: 'existing',
				source: SYSTEM_CHAT_SOURCE,
				payload: {
					kind: 'system',
					userId: 'user-1',
					message: 'hello',
					resourceId: 'system-chat:user-1',
				},
			});

			expect(messages.createInput).toHaveBeenCalledWith(
				expect.objectContaining({ origin: { source: SYSTEM_CHAT_SOURCE } }),
				expect.anything(),
			);
		});

		it('leaves hidden messages out of the pending list', async () => {
			threadRepository.findOneBy.mockResolvedValue(systemThread());
			repository.listPending.mockResolvedValue([
				queuedItem('visible', false),
				queuedItem('hidden', true),
			]);
			steering.findEligible.mockResolvedValue(null);

			const result = await service.listPending({
				projectId: 'project-1',
				agentId: 'system-agent',
				threadId: 'thread-1',
				userId: 'user-1',
				kind: 'system',
			});

			expect(result.items.map((item) => item.id)).toEqual(['visible']);
		});
	});

	describe('system threads', () => {
		const systemThread = makeThread({ agentId: 'system-agent' });

		beforeEach(() => {
			systemAgents.register(
				mock<SystemAgentProvider>({ agentId: 'system-agent', name: 'System agent' }),
			);
			threadRepository.findOneBy.mockResolvedValue(systemThread);
			repository.listPending.mockResolvedValue([]);
			steering.findEligible.mockResolvedValue(null);
		});

		it('lists the queue of a system thread before its first execution', async () => {
			executionRepository.findFirstSourceByThreadIds.mockResolvedValue(new Map());

			const result = await service.listPending({
				projectId: 'project-1',
				agentId: 'system-agent',
				threadId: 'thread-1',
				userId: 'user-1',
				kind: 'system',
			});

			expect(result).toEqual({ items: [], steerableExecutionId: null });
		});

		it('refuses the Preview queue of a system thread before its first execution', async () => {
			executionRepository.findFirstSourceByThreadIds.mockResolvedValue(new Map());

			await expect(
				service.listPending({
					projectId: 'project-1',
					agentId: 'system-agent',
					threadId: 'thread-1',
					userId: 'user-1',
					kind: 'preview',
				}),
			).rejects.toThrow('Session not found');
		});

		it('refuses the system queue of a project agent thread with a system source', async () => {
			threadRepository.findOneBy.mockResolvedValue(makeThread());
			executionRepository.findFirstSourceByThreadIds.mockResolvedValue(
				new Map([['thread-1', SYSTEM_CHAT_SOURCE]]),
			);

			await expect(
				service.listPending({
					projectId: 'project-1',
					agentId: 'agent-1',
					threadId: 'thread-1',
					userId: 'user-1',
					kind: 'system',
				}),
			).rejects.toThrow('Session not found');
		});
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
