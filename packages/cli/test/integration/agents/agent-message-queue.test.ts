import { AgentConversationLeaseLostError } from '@/modules/agents/agent-conversation-lease.types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Logger } from '@n8n/backend-common';
import { TransactionRunner } from '@n8n/db';
import { AgentConversationLeaseService } from '@/modules/agents/agent-conversation-lease.service';
import { AgentConversationLeaseRepository } from '@/modules/agents/repositories/agent-conversation-lease.repository';
import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { createServiceStack } from 'n8n-containers';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { SerializableAgentState } from '@n8n/agents';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type {
	AgentChatAttachmentService,
	StoredAttachmentRef,
} from '@/modules/agents/agent-chat-attachment.service';
import { AgentWorkflowToolResumeService } from '@/modules/agents/agent-workflow-tool-resume.service';
import { AgentWakeService } from '@/modules/agents/background/agent-wake.service';
import { hashAgentSandboxPrincipal } from '@/modules/agents/agent-sandbox-principal';
import type { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import type { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import type { AgentBackgroundJob } from '@/modules/agents/entities/agent-background-job.entity';
import type { ChatIntegrationRegistry } from '@/modules/agents/integrations/agent-chat-integration';
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import { AgentMessageQueueService } from '@/modules/agents/agent-message-queue.service';
import type {
	AgentQueueInput,
	QueueExecutionContext,
	IntegrationMessageQueuePayload,
} from '@/modules/agents/agent-message-queue.types';
import type { AgentChatBridge } from '@/modules/agents/integrations/agent-chat-bridge';
import type { ChatIntegrationService } from '@/modules/agents/integrations/chat-integration.service';
import type { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentChatAttachmentRepository } from '@/modules/agents/repositories/agent-chat-attachment.repository';
import { AgentMessageQueueRepository } from '@/modules/agents/repositories/agent-message-queue.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { PubSubEventBus } from '@/scaling/pubsub/pubsub.eventbus';
import { RedisClientService } from '@/services/redis-client.service';

import { retryUntil } from '../shared/retry-until';

describe('agent message queue', () => {
	let repository: AgentMessageQueueRepository;
	let attachmentRepository: AgentChatAttachmentRepository;
	let agents: AgentRepository;
	let agentId: string;
	let projectId: string;
	let mains: AgentMessageQueueService[];
	let redisStack: Awaited<ReturnType<typeof createServiceStack>> | undefined;
	let redisConfig: GlobalConfig | undefined;
	let closeRedis: Array<() => void>;
	const checkpoints = mock<N8NCheckpointStorage>();
	const bridge = mock<AgentChatBridge>();
	const integrations = mock<ChatIntegrationService>();
	const attachments = mock<AgentChatAttachmentService>();
	let executions: AgentExecutionService;
	const received: string[] = [];

	const message = (text: string, threadId = 'conversation'): AgentQueueInput => ({
		agentId,
		threadId,
		payload: {
			source: 'integration',
			kind: 'message',
			projectId,
			resourceId: 'slack:user',
			integrationType: 'slack',
			credentialId: 'connection',
			contextThreadId: threadId,
			isNewMention: false,
			thread: {
				_type: 'chat:Thread',
				adapterName: 'slack',
				id: 'slack:channel:thread',
				channelId: 'channel',
				isDM: false,
			},
			message: {
				_type: 'chat:Message',
				id: randomUUID(),
				threadId: 'slack:channel:thread',
				text,
				raw: {},
				attachments: [],
				formatted: { type: 'root', children: [] },
				metadata: { dateSent: new Date().toISOString(), edited: false },
				author: { userId: 'user', userName: 'user', fullName: 'User', isBot: false, isMe: false },
			},
		},
	});

	const preview = (
		text: string,
		threadId = 'conversation',
		files?: StoredAttachmentRef[],
	): AgentQueueInput => ({
		agentId,
		threadId,
		payload: {
			source: 'preview',
			kind: 'message',
			projectId,
			resourceId: 'user',
			userId: 'user',
			message: text,
			attachments: files,
		},
	});

	const makeMain = async () => {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		let publisher: Publisher;
		let eventBus: PubSubEventBus | undefined;
		if (redisConfig) {
			const clients = new RedisClientService(logger, redisConfig);
			const instance = mock<InstanceSettings>({ hostId: randomUUID(), isWorker: false });
			publisher = new Publisher(logger, clients, instance, redisConfig.executions, redisConfig);
			eventBus = new PubSubEventBus();
			const subscriber = new Subscriber(
				logger,
				instance,
				eventBus,
				clients,
				redisConfig.executions,
				redisConfig,
			);
			await subscriber.subscribe(subscriber.getCommandChannel());
			closeRedis.push(() => {
				publisher.shutdown();
				subscriber.shutdown();
			});
		} else {
			const localPublisher = mock<Publisher>();
			localPublisher.publishCommand.mockImplementation(async (command) => {
				if (command.command === 'drain-agent-message-queue') {
					for (const peer of mains) if (peer !== main) peer.handleDrainRequest(command.payload);
				}
			});
			publisher = localPublisher;
		}
		const main = new AgentMessageQueueService(
			logger,
			repository,
			new AgentConversationLeaseService(
				Container.get(AgentConversationLeaseRepository),
				Container.get(TransactionRunner),
				logger,
			),
			checkpoints,
			integrations,
			agents,
			Container.get(AgentExecutionRepository),
			executions,
			attachments,
			publisher,
		);
		eventBus?.on('drain-agent-message-queue', (payload) => main.handleDrainRequest(payload));
		mains.push(main);
		main.start();
		return main;
	};

	beforeAll(async () => {
		// These races require independent database connections.
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentMessageQueueRepository);
		attachmentRepository = Container.get(AgentChatAttachmentRepository);
		agents = Container.get(AgentRepository);
		executions = new AgentExecutionService(
			mock(),
			Container.get(AgentExecutionRepository),
			Container.get(AgentExecutionThreadRepository),
			mock(),
			mock(),
			attachments,
			mock(),
			mock(),
			mock(),
			mock(),
			repository,
			Container.get(AgentConversationLeaseService),
		);
		if (process.env.DB_TYPE === 'postgresdb') {
			redisStack = await createServiceStack({
				services: ['redis'],
				projectName: `agent-queue-${randomUUID().slice(0, 8)}`,
			});
			const redis = redisStack.serviceResults.redis;
			if (!redis) throw new Error('Redis did not start');
			redisConfig = Container.get(GlobalConfig);
			redisConfig.queue.bull.redis.host = redis.container.getHost();
			redisConfig.queue.bull.redis.port = redis.container.getMappedPort(6379);
			redisConfig.redis.prefix = `agent-queue-${randomUUID()}`;
			redisConfig.executions.mode = 'queue';
		}
	}, 60_000);

	beforeEach(async () => {
		vi.clearAllMocks();
		await repository.delete({});
		await agents.delete({});
		projectId = (await createTeamProject()).id;
		agentId = randomUUID();
		await agents.save(
			agents.create({
				id: agentId,
				name: 'Queued agent',
				projectId,
				versionId: randomUUID(),
				integrations: [{ type: 'slack', credentialId: 'connection' }],
			}),
		);
		mains = [];
		closeRedis = [];
		received.length = 0;
		checkpoints.findSuspendedForThread.mockResolvedValue(null);
		integrations.getBridge.mockReturnValue(bridge);
		bridge.processQueuedInput.mockImplementation(async (payload) => {
			received.push(payload.kind === 'message' ? payload.message.text : payload.runId);
		});
	});

	afterEach(async () => {
		await Promise.all(mains.map(async (main) => await main.shutdown()));
		await Promise.all(mains.flatMap((main) => [...main['drains'].values()]));
		for (const close of closeRedis) close();
	});
	afterAll(async () => {
		await testDb.terminate();
		await redisStack?.stop();
	});

	it('persists arrivals during execution and processes them in FIFO order across mains', async () => {
		const first = createDeferredPromise();
		bridge.processQueuedInput.mockImplementation(async (payload) => {
			if (payload.kind !== 'message') return;
			received.push(payload.message.text);
			if (payload.message.text === 'first') await first.promise;
		});
		const mainA = await makeMain();
		const mainB = await makeMain();
		try {
			await mainA.enqueue(message('first'));
			await retryUntil(async () => expect(received).toEqual(['first']));
			await mainB.enqueue(message('second'));
			await mainA.enqueue(message('third'));
			expect(await repository.countBy({ status: 'queued' })).toBe(2);
			expect(received).toEqual(['first']);
			first.resolve();
			await retryUntil(async () => expect(await repository.count()).toBe(0));
			expect(received).toEqual(['first', 'second', 'third']);
		} finally {
			first.resolve();
		}
	});

	it('runs another conversation while the first conversation is busy', async () => {
		const release = createDeferredPromise();
		bridge.processQueuedInput.mockImplementation(async (payload) => {
			if (payload.kind !== 'message') return;
			received.push(payload.message.text);
			if (payload.message.text === 'first') await release.promise;
		});
		const main = await makeMain();
		try {
			await main.enqueue(message('first', 'one'));
			await main.enqueue(message('second', 'two'));
			await retryUntil(async () => expect(received).toContain('second'));
			expect(await repository.countBy({ threadId: 'one', status: 'processing' })).toBe(1);
			release.resolve();
			await retryUntil(async () => expect(await repository.count()).toBe(0));
		} finally {
			release.resolve();
		}
	});

	it('processes HITL before ordinary messages and holds them through another suspension', async () => {
		const paused = mock<SerializableAgentState>({ status: 'suspended' });
		checkpoints.findSuspendedForThread.mockResolvedValue(paused);
		const main = await makeMain();
		await main.enqueue(message('ordinary'));
		const base = message('unused').payload as IntegrationMessageQueuePayload;
		await main.enqueue({
			agentId,
			threadId: 'conversation',
			payload: {
				...base,
				kind: 'hitl',
				runId: 'approval',
				toolCallId: 'tool',
				resumeData: { approved: true },
				action: { messageId: 'card', user: base.message.author, raw: {}, callbackData: {} },
			},
		});
		await main.drain('conversation');
		expect(received).toEqual(['approval']);
		expect(await repository.countBy({ status: 'queued' })).toBe(1);
		checkpoints.findSuspendedForThread.mockResolvedValue(null);
		await main.drain('conversation');
		expect(received).toEqual(['approval', 'ordinary']);
	});

	it('shares the conversation lease with wakes and automatic workflow continuations', async () => {
		const mainA = await makeMain();
		const mainB = await makeMain();
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const wakeStarted = createDeferredPromise();
		const finishWake = createDeferredPromise();
		const messageStarted = createDeferredPromise();
		const finishMessage = createDeferredPromise();
		const resumeStarted = createDeferredPromise();
		const finishResume = createDeferredPromise();
		let active = 0;
		let peak = 0;
		const begin = (name: string) => {
			received.push(name);
			peak = Math.max(peak, ++active);
		};
		let paused = false;
		const checkpoint = mock<SerializableAgentState>({ status: 'suspended' });
		checkpoints.findSuspendedForThread.mockImplementation(async () => (paused ? checkpoint : null));
		checkpoints.getStatus.mockImplementation(async () =>
			paused ? { status: 'active', checkpoint } : { status: 'not-found' },
		);
		bridge.processQueuedInput.mockImplementation(async (payload) => {
			if (payload.kind === 'hitl') {
				begin('hitl');
				paused = false;
			} else {
				begin(payload.message.text);
				if (payload.message.text === 'first') {
					messageStarted.resolve();
					await finishMessage.promise;
					paused = true;
				}
			}
			active--;
		});
		bridge.resumeInAgentThread.mockImplementation(async () => {
			begin('automatic');
			resumeStarted.resolve();
			await finishResume.promise;
			active--;
		});
		const automatic = new AgentWorkflowToolResumeService(
			logger,
			mock(),
			mock(),
			integrations,
			mock(),
			mock(),
			checkpoints,
			mock(),
			mock(),
			mock(),
			mainB['leases'],
			mainB,
		);
		const jobs = mock<AgentBackgroundJobRepository>();
		jobs.findWakeableUnconsumedSettled.mockResolvedValue([
			mock<AgentBackgroundJob>({
				id: 'job',
				parentAgentId: agentId,
				parentThreadId: 'conversation',
				parentResourceId: 'integration:slack:user',
				parentPrincipalHash: hashAgentSandboxPrincipal({
					type: 'integration-thread',
					platform: 'slack',
					connectionId: 'connection',
					platformThreadId: 'thread',
				}),
				kind: 'workflow',
				status: 'completed',
				title: 'Task',
				result: 'Done',
				error: null,
				settledAt: new Date(),
			}),
		]);
		const registry = mock<ChatIntegrationRegistry>();
		registry.get.mockReturnValue({} as never);
		const orchestrator = mock<AgentExecutionOrchestratorService>();
		orchestrator.executeForWake.mockImplementation(async () => {
			begin('wake');
			wakeStarted.resolve();
			await finishWake.promise;
			active--;
		});
		const wake = new AgentWakeService(
			jobs,
			Container.get(AgentExecutionRepository),
			agents,
			mock(),
			checkpoints,
			registry,
			orchestrator,
			mainB['leases'],
			mock(),
			mock(),
			mock({ backgroundTasksEnabled: true }),
			logger,
			mock(),
			mainB,
		);
		try {
			const waking = wake.attemptWake('conversation');
			await wakeStarted.promise;
			await mainA.enqueue(message('first'));
			await mainB.enqueue(message('second'));
			expect(received).toEqual(['wake']);
			finishWake.resolve();
			await waking;
			await messageStarted.promise;
			const resuming = automatic.resume(
				{
					agentId,
					projectId,
					threadId: 'conversation',
					runId: 'run',
					toolCallId: 'tool',
					integrationType: 'slack',
				},
				'success',
			);
			await wake.attemptWake('conversation');
			expect(bridge.resumeInAgentThread).not.toHaveBeenCalled();
			finishMessage.resolve();
			await resumeStarted.promise;
			const base = message('unused').payload as IntegrationMessageQueuePayload;
			await mainA.enqueue({
				agentId,
				threadId: 'conversation',
				payload: {
					...base,
					kind: 'hitl',
					runId: 'run',
					toolCallId: 'next-tool',
					resumeData: { approved: true },
					action: { messageId: 'card', user: base.message.author, raw: {}, callbackData: {} },
				},
			});
			expect(received).toEqual(['wake', 'first', 'automatic']);
			finishResume.resolve();
			await resuming;
			await retryUntil(async () => expect(await repository.count()).toBe(0));
			expect(received).toEqual(['wake', 'first', 'automatic', 'hitl', 'second']);
			expect(peak).toBe(1);
		} finally {
			finishWake.resolve();
			finishMessage.resolve();
			finishResume.resolve();
			for (const timer of wake['timers'].values()) clearTimeout(timer);
		}
	});

	it('keeps a preview entry on its origin main and preserves its place in the queue', async () => {
		const mainA = await makeMain();
		const mainB = await makeMain();
		checkpoints.findSuspendedForThread.mockResolvedValue(mock<SerializableAgentState>());
		const controller = new AbortController();
		const response = mainA.enqueuePreview(
			preview('preview'),
			async () => {
				received.push('preview');
			},
			controller.signal,
		);
		await retryUntil(async () => expect(await repository.count()).toBe(1));
		await mainB.enqueue(message('integration'));
		checkpoints.findSuspendedForThread.mockResolvedValue(null);
		mainB.notify('conversation');
		await response;
		await retryUntil(async () => expect(await repository.count()).toBe(0));
		expect(received).toEqual(['preview', 'integration']);
	});

	it('cancels a disconnected waiting preview without executing it', async () => {
		checkpoints.findSuspendedForThread.mockResolvedValue(mock<SerializableAgentState>());
		const main = await makeMain();
		const controller = new AbortController();
		const execute = vi.fn();
		const response = main.enqueuePreview(preview('cancelled'), execute, controller.signal);
		const rejected = expect(response).rejects.toThrow();
		await retryUntil(async () => expect(await repository.count()).toBe(1));
		controller.abort();
		await rejected;
		expect(await repository.count()).toBe(0);
		expect(execute).not.toHaveBeenCalled();
	});

	it('cancels a preview that finishes enqueueing during shutdown', async () => {
		const finishEnqueue = createDeferredPromise();
		const enqueue = repository.enqueue.bind(repository);
		vi.spyOn(repository, 'enqueue').mockImplementationOnce(async (input) => {
			const entry = await enqueue(input);
			await finishEnqueue.promise;
			return entry;
		});
		const main = await makeMain();
		const response = main.enqueuePreview(
			preview('stopping'),
			vi.fn(),
			new AbortController().signal,
		);
		try {
			await retryUntil(async () => expect(await repository.count()).toBe(1));
			await main.shutdown();
			finishEnqueue.resolve();
			await expect(response).rejects.toThrow('Message was cancelled');
			expect(await repository.count()).toBe(0);
		} finally {
			finishEnqueue.resolve();
		}
	});

	it('aborts an active preview and continues with the next input', async () => {
		const main = await makeMain();
		const controller = new AbortController();
		const started = createDeferredPromise();
		const response = main.enqueuePreview(
			preview('active'),
			async ({ abortSignal }) => {
				started.resolve();
				await new Promise<void>((resolve) =>
					abortSignal.addEventListener('abort', () => resolve(), { once: true }),
				);
				abortSignal.throwIfAborted();
			},
			controller.signal,
		);
		const rejected = expect(response).rejects.toThrow();
		try {
			await started.promise;
			await main.enqueue(message('next'));
			controller.abort();
			await rejected;
			await retryUntil(async () => expect(await repository.count()).toBe(0));
			expect(received).toEqual(['next']);
		} finally {
			controller.abort();
		}
	});

	it('waits for a connection to return and removes inputs for a deleted connection', async () => {
		integrations.getBridge.mockReturnValue(undefined);
		const main = await makeMain();
		await main.enqueue(message('first'));
		await main.enqueue(message('second'));
		await main.drain('conversation');
		expect(await repository.count()).toBe(2);
		expect(received).toEqual([]);

		integrations.getBridge.mockReturnValue(bridge);
		await main.onConnectionReady(agentId);
		await retryUntil(async () => expect(await repository.count()).toBe(0));
		expect(received).toEqual(['first', 'second']);

		integrations.getBridge.mockReturnValue(undefined);
		await main.enqueue(message('removed'));
		await main.drain('conversation');
		checkpoints.findSuspendedForThread.mockResolvedValue(mock<SerializableAgentState>());
		await agents.update(agentId, { integrations: [] });
		await main.drain('conversation');
		expect(await repository.count()).toBe(0);
		expect(received).toEqual(['first', 'second']);
	});

	it('cancels the old backlog without aborting the active input', async () => {
		const finish = createDeferredPromise();
		bridge.processQueuedInput.mockImplementationOnce(
			async (_payload, _threadId, { abortSignal }) => {
				received.push('active');
				await finish.promise;
				expect(abortSignal.aborted).toBe(false);
			},
		);
		const mainA = await makeMain();
		const mainB = await makeMain();
		try {
			await mainA.enqueue(message('active'));
			await retryUntil(async () => expect(received).toEqual(['active']));
			await mainB.enqueue(message('old backlog'));
			await mainB.cancelWaiting('conversation');
			expect(await repository.countBy({ status: 'processing' })).toBe(1);
			expect(await repository.countBy({ status: 'queued' })).toBe(0);
			finish.resolve();
			await retryUntil(async () => expect(await repository.count()).toBe(0));
			expect(received).toEqual(['active']);
		} finally {
			finish.resolve();
		}
	});

	it('does not start an input removed after selection and before its claim', async () => {
		const selected = createDeferredPromise();
		const finishClaim = createDeferredPromise();
		const delayedClaim = vi
			.spyOn(checkpoints, 'findSuspendedForThread')
			.mockImplementationOnce(async () => {
				selected.resolve();
				await finishClaim.promise;
				return null;
			});
		const main = await makeMain();
		try {
			await main.enqueue(message('cancelled'));
			await selected.promise;
			await main.cancelWaiting('conversation');
			finishClaim.resolve();
			await main.drain('conversation');
			expect(received).toEqual([]);
			expect(await repository.count()).toBe(0);
		} finally {
			finishClaim.resolve();
			delayedClaim.mockRestore();
		}
	});

	it('uses an edit saved after selection and before the fenced claim', async () => {
		const selected = createDeferredPromise();
		const finish = createDeferredPromise();
		checkpoints.findSuspendedForThread.mockImplementationOnce(async () => {
			selected.resolve();
			await finish.promise;
			return null;
		});
		const main = await makeMain();
		const id = await main.enqueue(message('Original'));
		try {
			await selected.promise;
			const saved = await repository.update(
				{ id, status: 'queued' },
				{ payload: message('Edited').payload as never },
			);
			expect(saved.affected).toBe(1);
			finish.resolve();
			await main.drain('conversation');
			expect(received).toEqual(['Edited']);
		} finally {
			finish.resolve();
		}
	});

	it('rejects a former processor link, heartbeat, and cleanup without touching a successor', async () => {
		const started = createDeferredPromise<QueueExecutionContext>();
		const finish = createDeferredPromise();
		bridge.processQueuedInput.mockImplementation(async (_payload, _threadId, context) => {
			started.resolve(context);
			await finish.promise;
		});
		const main = await makeMain();
		const id = await main.enqueue(message('Old turn'));
		const context = await started.promise;
		const oldDrain = main['drains'].get('conversation')?.catch((error: unknown) => error);
		const leaseRepository = Container.get(AgentConversationLeaseRepository);
		try {
			await leaseRepository.update({ threadId: 'conversation' }, { expiresAt: new Date(0) });
			const successor = await leaseRepository.acquire(agentId, 'conversation');
			expect(successor).not.toBeNull();
			await repository.update({ id }, { updatedAt: new Date(0) });
			await expect(context.onExecutionStarted(randomUUID())).rejects.toBeInstanceOf(
				AgentConversationLeaseLostError,
			);
			await main['heartbeat']();
			finish.resolve();
			expect(await oldDrain).toBeInstanceOf(AgentConversationLeaseLostError);
			expect(await repository.findOneByOrFail({ id })).toMatchObject({
				status: 'processing',
				executionId: null,
				updatedAt: new Date(0),
			});
			expect(await leaseRepository.findOneByOrFail({ threadId: 'conversation' })).toMatchObject(
				successor!,
			);
		} finally {
			finish.resolve();
		}
	});

	it('heartbeats live preview waiters in one batch so another main does not cancel them', async () => {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
		const controller = new AbortController();
		const main = await makeMain();
		const peer = await makeMain();
		checkpoints.findSuspendedForThread.mockResolvedValue(mock<SerializableAgentState>());
		const waits = ['one', 'two'].map(
			async (id) => await main.enqueuePreview(preview(id, id), vi.fn(), controller.signal),
		);
		const cancelled = waits.map(async (wait) => await expect(wait).rejects.toThrow());
		try {
			await retryUntil(async () => expect(await repository.count()).toBe(2));
			await repository.update({}, { updatedAt: new Date(Date.now() - 180_000) });
			const heartbeat = vi.spyOn(repository, 'touchLiveEntries');
			await vi.advanceTimersByTimeAsync(30_000);
			await retryUntil(async () =>
				expect(await repository.findStaleConversations(120_000)).toEqual([]),
			);
			expect(heartbeat.mock.calls.filter(([ids]) => ids.length > 0)).toHaveLength(1);
			expect(heartbeat.mock.calls.find(([ids]) => ids.length > 0)?.[0]).toHaveLength(2);
			await peer.recover();
			expect(await repository.count()).toBe(2);
			heartbeat.mockRestore();
		} finally {
			controller.abort();
			await Promise.all(cancelled);
			await main.shutdown();
			await peer.shutdown();
			vi.useRealTimers();
		}
	});

	it('interrupts only stale running executions and preserves completed outcomes and checkpoints', async () => {
		const executionRepository = Container.get(AgentExecutionRepository);
		const old = new Date(Date.now() - 180_000);
		const ids: Record<string, string> = {};
		for (const threadId of ['interrupted', 'completed', 'suspended', 'healthy', 'refreshed']) {
			await Container.get(AgentExecutionThreadRepository).findOrCreate(
				threadId,
				agentId,
				'Agent',
				projectId,
			);
			const execution = await executionRepository.save(
				executionRepository.create({
					threadId,
					status:
						threadId === 'interrupted' || threadId === 'healthy' || threadId === 'refreshed'
							? 'running'
							: 'success',
					startedAt: old,
					updatedAt: threadId === 'healthy' ? new Date() : old,
					hitlStatus: threadId === 'suspended' ? 'suspended' : null,
				}),
			);
			ids[threadId] = execution.id;
			const entry = await repository.enqueue(message('do not replay', threadId));
			await repository.markProcessing(entry.id, {});
			await repository.linkExecution(entry.id, execution.id, {});
			await repository.update(entry.id, { updatedAt: old });
		}
		const suspension = mock<SerializableAgentState>({ status: 'suspended' });
		checkpoints.findSuspendedForThread.mockImplementation(async (_agentId, threadId) =>
			threadId === 'suspended' ? suspension : null,
		);
		await repository.enqueue(message('waiting', 'interrupted'));
		await repository.enqueue(message('still waiting', 'suspended'));
		const finalize = executions.finalizeInterruptedExecution.bind(executions);
		vi.spyOn(executions, 'finalizeInterruptedExecution').mockImplementation(
			async (execution, staleBefore) => {
				if (execution.threadId === 'refreshed') {
					await executionRepository.touchRunning(execution.id, {});
				}
				return await finalize(execution, staleBefore);
			},
		);
		await (await makeMain()).recover();
		await retryUntil(async () => expect(received).toEqual(['waiting']));
		expect(await executionRepository.findOneBy({ id: ids.interrupted })).toMatchObject({
			status: 'interrupted',
		});
		expect(await executionRepository.findOneBy({ id: ids.completed })).toMatchObject({
			status: 'success',
		});
		expect(await executionRepository.findOneBy({ id: ids.suspended })).toMatchObject({
			status: 'success',
			hitlStatus: 'suspended',
		});
		expect(await executionRepository.findOneBy({ id: ids.healthy })).toMatchObject({
			status: 'running',
		});
		expect(await executionRepository.findOneBy({ id: ids.refreshed })).toMatchObject({
			status: 'running',
			stoppedAt: null,
		});
		expect(await repository.countBy({ threadId: 'healthy', status: 'processing' })).toBe(1);
		expect(await repository.countBy({ threadId: 'refreshed', status: 'processing' })).toBe(1);
		expect(await repository.countBy({ threadId: 'suspended', status: 'queued' })).toBe(1);
	});

	it('preserves a preview and its attachment when it becomes live before recovery acquires ownership', async () => {
		const threadId = 'refreshed-preview';
		const entry = await repository.enqueue(
			preview('waiting', threadId, [
				{ id: 'live-file', fileName: 'note.txt', mimeType: 'text/plain', sizeBytes: 1 },
			]),
		);
		await attachmentRepository.save(
			attachmentRepository.create({
				id: 'live-file',
				agentId,
				projectId,
				threadId,
				resourceId: 'user',
				binaryDataId: 'filesystem-v2:live-file',
				fileName: 'note.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 1,
				source: 'preview',
			}),
		);
		await repository.update(entry.id, { updatedAt: new Date(0) });
		checkpoints.findSuspendedForThread.mockResolvedValue(mock<SerializableAgentState>());
		const leaseRepository = Container.get(AgentConversationLeaseRepository);
		const acquire = leaseRepository.acquire.bind(leaseRepository);
		const acquiring = createDeferredPromise();
		const refreshed = createDeferredPromise();
		const acquisition = vi
			.spyOn(leaseRepository, 'acquire')
			.mockImplementationOnce(async (...args) => {
				acquiring.resolve();
				await refreshed.promise;
				return await acquire(...args);
			});
		const main = await makeMain();
		const recovery = main.recover();
		try {
			await acquiring.promise;
			await repository.touchLiveEntries([entry.id]);
			refreshed.resolve();
			await recovery;
			expect(await repository.findOneByOrFail({ id: entry.id })).toMatchObject({
				status: 'queued',
			});
			expect(await attachmentRepository.existsBy({ id: 'live-file' })).toBe(true);
			expect(attachments.deleteStoredBytes).not.toHaveBeenCalled();
		} finally {
			refreshed.resolve();
			await recovery;
			acquisition.mockRestore();
		}
	});

	it('stops recovery when its conversation lease is lost', async () => {
		const stale = await repository.enqueue(
			preview('lost', 'lost-preview', [
				{ id: 'unused-file', fileName: 'note.txt', mimeType: 'text/plain', sizeBytes: 1 },
			]),
		);
		await repository.update(stale.id, { updatedAt: new Date(Date.now() - 180_000) });
		const findStale = repository.findStale.bind(repository);
		const staleRead = vi.spyOn(repository, 'findStale').mockImplementation(async (...args) => {
			const entries = await findStale(...args);
			await Container.get(AgentConversationLeaseRepository).update(
				{ threadId: 'lost-preview' },
				{ expiresAt: new Date(0) },
			);
			return entries;
		});
		const main = await makeMain();

		await main.recover();

		expect(await repository.existsBy({ id: stale.id })).toBe(true);
		expect(attachments.deleteStoredBytes).not.toHaveBeenCalled();
		staleRead.mockRestore();
	});

	it('recovers waiting integrations, abandons interrupted inputs, and keeps live preview waiters', async () => {
		const abandoned = await repository.enqueue(message('interrupted'));
		await repository.markProcessing(abandoned.id, {});
		await repository.update(abandoned.id, { updatedAt: new Date(Date.now() - 180_000) });
		await repository.enqueue(message('waiting'));
		const lostPreview = await repository.enqueue(
			preview('lost', 'lost-preview', [
				{ id: 'unused-file', fileName: 'note.txt', mimeType: 'text/plain', sizeBytes: 1 },
			]),
		);
		await attachmentRepository.save(
			attachmentRepository.create({
				id: 'unused-file',
				agentId,
				projectId,
				threadId: 'lost-preview',
				resourceId: 'user',
				binaryDataId: 'filesystem-v2:unused-file',
				fileName: 'note.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 1,
				source: 'preview',
			}),
		);
		await repository.update(lostPreview.id, { updatedAt: new Date(Date.now() - 180_000) });
		checkpoints.findSuspendedForThread.mockImplementation(async (_agentId, threadId) =>
			threadId === 'live-preview' ? mock<SerializableAgentState>() : null,
		);
		const origin = await makeMain();
		const controller = new AbortController();
		const live = origin.enqueuePreview(preview('live', 'live-preview'), vi.fn(), controller.signal);
		const cancelled = expect(live).rejects.toThrow();
		await retryUntil(async () =>
			expect(await repository.countBy({ threadId: 'live-preview' })).toBe(1),
		);
		await (await makeMain()).recover();
		await retryUntil(async () => expect(received).toEqual(['waiting']));
		expect(await repository.countBy({ threadId: 'lost-preview' })).toBe(0);
		expect(await attachmentRepository.existsBy({ id: 'unused-file' })).toBe(false);
		expect(attachments.deleteStoredBytes).toHaveBeenCalledWith([
			{ id: 'unused-file', binaryDataId: 'filesystem-v2:unused-file' },
		]);
		expect(await repository.countBy({ threadId: 'live-preview' })).toBe(1);
		controller.abort();
		await cancelled;
	});
});
