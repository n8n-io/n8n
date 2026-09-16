import { AgentConversationLeaseLostError } from '@/modules/agents/agent-conversation-lease.types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { LockService, type Logger } from '@n8n/backend-common';
import { RedisLockService } from '@/scaling/redis-lock.service';
import { TransactionRunner } from '@n8n/db';
import { AgentConversationLeaseService } from '@/modules/agents/agent-conversation-lease.service';
import { AgentConversationLeaseRepository } from '@/modules/agents/repositories/agent-conversation-lease.repository';
import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';
import type { ProjectRelationRepository } from '@n8n/db';
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
import { AgentExecutionUpdateBroadcaster } from '@/modules/agents/agent-execution-update-broadcaster';
import type { Push } from '@/push';
import type { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import type { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import type { AgentBackgroundJob } from '@/modules/agents/entities/agent-background-job.entity';
import type { ChatIntegrationRegistry } from '@/modules/agents/integrations/agent-chat-integration';
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import { AgentMessageQueueService } from '@/modules/agents/agent-message-queue.service';
import type {
	AgentQueueInput,
	QueueExecutionContext,
	AgentPreviewQueueInput,
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
	const orchestrator = mock<AgentExecutionOrchestratorService>();
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
	): AgentPreviewQueueInput => ({
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
		const instance = mock<InstanceSettings>({
			hostId: randomUUID(),
			isWorker: false,
			isMultiMain: true,
		});
		let publisher: Publisher;
		let consumerLocks = Container.get(LockService);
		let eventBus: PubSubEventBus | undefined;
		if (redisConfig) {
			const clients = new RedisClientService(logger, redisConfig);
			const redisLocks = new RedisLockService(logger, redisConfig, clients);
			consumerLocks = new LockService(mock<ConstructorParameters<typeof LockService>[0]>());
			consumerLocks.setProvider(redisLocks);
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
				redisLocks.destroy();
			});
		} else {
			const localPublisher = mock<Publisher>();
			localPublisher.publishCommand.mockImplementation(async (command) => {
				if (command.command === 'drain-agent-message-queue') {
					for (const peer of mains) if (peer !== main) peer.handleDrainRequest(command.payload);
				} else if (command.command === 'relay-agent-chat-event') {
					for (const peer of mains)
						if (peer !== main) peer['broadcaster'].handleChatEvent(command.payload);
				}
			});
			publisher = localPublisher;
		}
		const projectRelations = mock<ProjectRelationRepository>();
		projectRelations.findUserIdsByProjectId.mockResolvedValue([]);
		const broadcaster = new AgentExecutionUpdateBroadcaster(
			logger,
			projectRelations,
			mock<Push>(),
			publisher,
			instance,
			Container.get(AgentExecutionThreadRepository),
		);
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
			broadcaster,
			orchestrator,
			consumerLocks,
		);
		eventBus?.on('drain-agent-message-queue', (payload) => main.handleDrainRequest(payload));
		eventBus?.on('relay-agent-chat-event', (payload) => broadcaster.handleChatEvent(payload));
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
		const paused = mock<SerializableAgentState & { runId: string }>({ status: 'suspended' });
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
		const checkpoint = mock<SerializableAgentState & { runId: string }>({ status: 'suspended' });
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
		checkpoints.findSuspendedForThread.mockResolvedValue(
			mock<SerializableAgentState & { runId: string }>(),
		);
		await mainA.enqueuePreview(preview('preview'), 'request', async () => {
			received.push('preview');
		});
		await mainB.enqueue(message('integration'));
		checkpoints.findSuspendedForThread.mockResolvedValue(null);
		mainB.notify('conversation');
		await retryUntil(async () => expect(await repository.count()).toBe(0));
		expect(received).toEqual(['preview', 'integration']);
	});

	it('admits only one concurrent preview response for a suspended tool call', async () => {
		const checkpoint: SerializableAgentState = {
			status: 'suspended',
			persistence: { threadId: 'conversation', resourceId: 'user' },
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {
				tool: {
					toolCallId: 'tool',
					toolName: 'approval',
					input: {},
					suspended: true,
					runId: 'run',
					resumeSchema: { type: 'object' },
					suspendPayload: {},
				},
			},
		};
		checkpoints.getStatus.mockResolvedValue({ status: 'active', checkpoint });
		const resume: AgentPreviewQueueInput = {
			agentId,
			threadId: 'conversation',
			payload: {
				source: 'preview',
				kind: 'hitl',
				projectId,
				userId: 'user',
				resourceId: 'user',
				runId: 'run',
				toolCallId: 'tool',
				resumeData: { approved: true },
			},
		};
		const inserted = createDeferredPromise();
		const releaseAdmission = createDeferredPromise();
		const finishExecution = createDeferredPromise();
		const enqueue = repository.enqueue.bind(repository);
		vi.spyOn(repository, 'enqueue').mockImplementationOnce(async (input) => {
			const entry = await enqueue(input);
			inserted.resolve();
			await releaseAdmission.promise;
			return entry;
		});
		const mainA = await makeMain();
		const mainB = await makeMain();
		const execute = async () => await finishExecution.promise;

		const first = mainA.enqueuePreview(resume, 'request-1', execute);
		await inserted.promise;
		const second = mainB.enqueuePreview(resume, 'request-2', execute);
		try {
			releaseAdmission.resolve();
			const results = await Promise.allSettled([first, second]);
			expect(results[0].status).toBe('fulfilled');
			expect(results[1]).toMatchObject({
				status: 'rejected',
				reason: { message: 'This action has already been handled or has expired' },
			});
			expect(await repository.findPreviewEntries(agentId, 'conversation')).toHaveLength(1);
			finishExecution.resolve();
			await retryUntil(async () => expect(await repository.count()).toBe(0));
		} finally {
			releaseAdmission.resolve();
			finishExecution.resolve();
		}
	});

	it('acknowledges waiting previews and removes only the selected message from another main', async () => {
		checkpoints.findSuspendedForThread.mockResolvedValue(
			mock<SerializableAgentState & { runId: string }>(),
		);
		const main = await makeMain();
		const peer = await makeMain();
		const scope = {
			agentId,
			projectId,
			threadId: 'conversation',
			userId: 'user',
			resourceId: 'user',
		};
		const items = [];
		for (const text of ['one', 'two', 'three']) {
			items.push(
				await main.enqueuePreview(preview(text), text, async (payload) => {
					if (payload.kind === 'message') received.push(payload.message);
				}),
			);
		}
		expect(await repository.count()).toBe(3);
		await peer.removePreview(scope, items[1].id);
		expect((await peer.listPreview(scope)).map((item) => item.id)).toEqual([
			items[0].id,
			items[2].id,
		]);
		checkpoints.findSuspendedForThread.mockResolvedValue(null);
		peer.notify('conversation');
		await retryUntil(async () => expect(await repository.count()).toBe(0));
		expect(received).toEqual(['one', 'three']);
	});

	it('keeps attachments and the queue position on edits and checks the preview owner', async () => {
		checkpoints.findSuspendedForThread.mockResolvedValue(
			mock<SerializableAgentState & { runId: string }>(),
		);
		const main = await makeMain();
		const scope = {
			agentId,
			projectId,
			threadId: 'conversation',
			userId: 'user',
			resourceId: 'user',
		};
		const files = [{ id: 'file', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 10 }];
		const item = await main.enqueuePreview(
			preview('original', 'conversation', files),
			'request',
			vi.fn(),
		);
		for (const foreign of [{ userId: 'other' }, { projectId: 'other' }, { threadId: 'other' }]) {
			expect(await main.listPreview({ ...scope, ...foreign })).toEqual([]);
			await expect(main.editPreview({ ...scope, ...foreign }, item.id, 'changed')).rejects.toThrow(
				'not found',
			);
			await expect(main.removePreview({ ...scope, ...foreign }, item.id)).rejects.toThrow(
				'not found',
			);
			await expect(main.stopPreview({ ...scope, ...foreign }, item.id)).rejects.toThrow(
				'not found',
			);
		}
		expect(await main.editPreview(scope, item.id, '')).toEqual({
			...item,
			message: '',
			attachments: files,
		});
		await main.removePreview(scope, item.id);
		expect(await repository.count()).toBe(0);
		expect(attachments.deleteByIds).toHaveBeenCalledWith(['file']);
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
		const response = main.enqueuePreview(preview('stopping'), 'request', vi.fn());
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

	it('stops an active preview through another main and waits for cleanup before the next input', async () => {
		const main = await makeMain();
		const peer = await makeMain();
		const started = createDeferredPromise();
		const aborted = createDeferredPromise();
		const finishCleanup = createDeferredPromise();
		const laterStarted = createDeferredPromise<AbortSignal>();
		const finishLater = createDeferredPromise();
		const scope = {
			agentId,
			projectId,
			threadId: 'conversation',
			userId: 'user',
			resourceId: 'user',
		};
		const item = await main.enqueuePreview(
			preview('active'),
			'request',
			async (_payload, { abortSignal }) => {
				started.resolve();
				await new Promise<void>((resolve) =>
					abortSignal.addEventListener('abort', () => resolve(), { once: true }),
				);
				aborted.resolve();
				await finishCleanup.promise;
			},
		);
		try {
			await started.promise;
			await main.enqueue(message('next'));
			expect(await peer.stopPreview(scope, item.id)).toBe(true);
			await aborted.promise;
			expect((await repository.findById(item.id))?.status).toBe('cancelling');
			expect(received).toEqual([]);
			finishCleanup.resolve();
			await retryUntil(async () => expect(await repository.count()).toBe(0));
			expect(received).toEqual(['next']);
			const later = await main.enqueuePreview(
				preview('later'),
				'later-request',
				async (_payload, { abortSignal }) => {
					laterStarted.resolve(abortSignal);
					await finishLater.promise;
				},
			);
			const laterSignal = await laterStarted.promise;
			expect(later.id).not.toBe(item.id);
			await expect(peer.stopPreview(scope, item.id)).rejects.toThrow('not found');
			expect(laterSignal.aborted).toBe(false);
			finishLater.resolve();
			await retryUntil(async () => expect(await repository.count()).toBe(0));
		} finally {
			finishCleanup.resolve();
			finishLater.resolve();
		}
	});

	it('cancels a preview that suspends during Stop before releasing the next message', async () => {
		const main = await makeMain();
		const peer = await makeMain();
		const reachedFinish = createDeferredPromise();
		const finish = createDeferredPromise();
		const finishProcessing = repository.finishProcessing.bind(repository);
		vi.spyOn(repository, 'finishProcessing').mockImplementationOnce(async (id) => {
			reachedFinish.resolve();
			await finish.promise;
			return await finishProcessing(id);
		});
		const checkpoint = mock<SerializableAgentState & { runId: string }>({
			runId: 'suspended-run',
			status: 'suspended',
			persistence: { threadId: 'conversation', resourceId: 'user' },
		});
		const cancel = vi.mocked(main['orchestrator'].cancelChatRun);
		cancel.mockImplementation(async () => {
			expect(received).toEqual([]);
			expect(await repository.countBy({ status: 'cancelling' })).toBe(1);
			checkpoints.findSuspendedForThread.mockResolvedValue(null);
			return true;
		});
		const item = await main.enqueuePreview(preview('first'), 'request-1', async () => {
			checkpoints.findSuspendedForThread.mockResolvedValue(checkpoint);
		});
		try {
			await reachedFinish.promise;
			await main.enqueue(message('next'));
			await peer.stopPreview(
				{ agentId, projectId, threadId: 'conversation', userId: 'user', resourceId: 'user' },
				item.id,
			);
			finish.resolve();
			await retryUntil(async () => expect(await repository.count()).toBe(0));
			expect(cancel).toHaveBeenCalledWith({ agentId, runId: 'suspended-run', resourceId: 'user' });
			expect(received).toEqual(['next']);
		} finally {
			finish.resolve();
		}
	});

	it('orders preview events across mains and continues when a viewer cannot receive an event', async () => {
		const main = await makeMain();
		const peer = await makeMain();
		const push = vi.mocked(peer['broadcaster']['push'].sendToUsers);
		const send = vi.spyOn(main['broadcaster'], 'sendChatEvent');
		send.mockRejectedValueOnce(new Error('Viewer unavailable'));
		await main.enqueuePreview(preview('first'), 'request-1', async (_payload, context) => {
			context.send({ type: 'text-delta', id: 'text', delta: 'one' });
			context.send({ type: 'text-delta', id: 'text', delta: 'two' });
		});
		await main.drain('conversation');
		await retryUntil(async () => expect(push).toHaveBeenCalledTimes(3));
		expect(
			push.mock.calls.map(([event]) => (event.type === 'agentChatEvent' ? event.data.event : null)),
		).toEqual([
			{ type: 'text-delta', id: 'text', delta: 'one' },
			{ type: 'text-delta', id: 'text', delta: 'two' },
			{ type: 'done', sessionId: 'conversation' },
		]);
		expect(
			push.mock.calls.every(([, userIds]) => userIds.length === 1 && userIds[0] === 'user'),
		).toBe(true);
		expect(await repository.count()).toBe(0);
	});

	it('records a failure after admission without a viewer and keeps referenced attachments', async () => {
		const main = await makeMain();
		const files = [{ id: 'file-1', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 4 }];
		await main.enqueuePreview(preview('failed', 'failure', files), 'request-1', async () => {
			throw new Error('Model unavailable');
		});
		await main.drain('failure');
		const history = await executions.getThreadDetail('failure', projectId, agentId);
		expect(history?.executions).toHaveLength(1);
		expect(history?.executions[0]).toMatchObject({ status: 'error', userMessage: 'failed' });
		expect(attachments.deleteByIds).not.toHaveBeenCalledWith(['file-1']);
		expect(await repository.count()).toBe(0);
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
		checkpoints.findSuspendedForThread.mockResolvedValue(
			mock<SerializableAgentState & { runId: string }>(),
		);
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

	it('uses a saved edit made after selection and rejects edits after the claim', async () => {
		const selected = createDeferredPromise();
		const finishClaim = createDeferredPromise();
		const started = createDeferredPromise();
		const finishRun = createDeferredPromise();
		checkpoints.findSuspendedForThread.mockImplementationOnce(async () => {
			selected.resolve();
			await finishClaim.promise;
			return null;
		});
		const main = await makeMain();
		const scope = {
			agentId,
			projectId,
			threadId: 'conversation',
			userId: 'user',
			resourceId: 'user',
		};
		try {
			const item = await main.enqueuePreview(preview('original'), 'request-1', async (payload) => {
				if (payload.kind === 'message') received.push(payload.message);
				started.resolve();
				await finishRun.promise;
			});
			await selected.promise;
			await main.editPreview(scope, item.id, 'saved');
			finishClaim.resolve();
			await started.promise;
			expect(received).toEqual(['saved']);
			await expect(main.editPreview(scope, item.id, 'too late')).rejects.toThrow();
			await expect(main.removePreview(scope, item.id)).rejects.toThrow();
		} finally {
			finishClaim.resolve();
			finishRun.resolve();
		}
	});

	it('heartbeats live preview waiters in one batch so another main does not cancel them', async () => {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
		const main = await makeMain();
		const peer = await makeMain();
		checkpoints.findSuspendedForThread.mockResolvedValue(
			mock<SerializableAgentState & { runId: string }>(),
		);
		await Promise.all(
			['one', 'two'].map(async (id) => await main.enqueuePreview(preview(id, id), id, vi.fn())),
		);
		try {
			await retryUntil(async () => expect(await repository.count()).toBe(2));
			await repository.update({}, { updatedAt: new Date(Date.now() - 180_000) });
			const heartbeat = vi.spyOn(repository, 'touchLiveEntries');
			await vi.advanceTimersByTimeAsync(30_000);
			await retryUntil(async () => expect(await repository.findStaleThreads(120_000)).toEqual([]));
			expect(heartbeat.mock.calls.filter(([ids]) => ids.length > 0)).toHaveLength(1);
			expect(heartbeat.mock.calls.find(([ids]) => ids.length > 0)?.[0]).toHaveLength(2);
			await peer.recover();
			expect(await repository.count()).toBe(2);
			heartbeat.mockRestore();
		} finally {
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
		const suspension = mock<SerializableAgentState & { runId: string }>({ status: 'suspended' });
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

	it('cancels a matching suspended run before recovering its stale cancelling preview', async () => {
		const stale = await repository.enqueue(preview('stopped'));
		await repository.markProcessing(stale.id);
		await repository.requestCancellation(stale.id);
		await repository.update(stale.id, { updatedAt: new Date(Date.now() - 180_000) });
		await repository.enqueue(message('successor'));
		checkpoints.findSuspendedForThread.mockResolvedValue(
			mock<SerializableAgentState & { runId: string }>({
				runId: 'stopped-run',
				status: 'suspended',
				persistence: { threadId: 'conversation', resourceId: 'user' },
			}),
		);
		const cancelled = createDeferredPromise();
		orchestrator.cancelChatRun.mockImplementation(async () => {
			await cancelled.promise;
			checkpoints.findSuspendedForThread.mockResolvedValue(null);
			return true;
		});
		const main = await makeMain();
		const lease = vi.spyOn(main['lockService'], 'withLease');
		let draining: Promise<void> | undefined;

		const recovering = main.recover();
		try {
			await retryUntil(async () => expect(orchestrator.cancelChatRun).toHaveBeenCalledTimes(1));
			draining = main.drain('conversation');
			await retryUntil(async () => expect(lease).toHaveBeenCalledTimes(2));
			expect(await repository.existsBy({ id: stale.id })).toBe(true);
			expect(received).toEqual([]);
			cancelled.resolve();
			await Promise.all([recovering, draining]);

			expect(orchestrator.cancelChatRun).toHaveBeenCalledWith({
				agentId,
				runId: 'stopped-run',
				resourceId: 'user',
			});
			await retryUntil(async () => expect(received).toEqual(['successor']));
			expect(await repository.existsBy({ id: stale.id })).toBe(false);
		} finally {
			cancelled.resolve();
			await Promise.all([recovering, draining]);
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
			threadId === 'live-preview' ? mock<SerializableAgentState & { runId: string }>() : null,
		);
		const origin = await makeMain();
		await origin.enqueuePreview(preview('live', 'live-preview'), 'request', vi.fn());
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
		await origin.shutdown();
	});
});
