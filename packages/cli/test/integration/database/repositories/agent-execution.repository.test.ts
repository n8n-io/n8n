import type {
	AgentSessionOrigin,
	AgentSessionQueryFilters,
	AgentSessionStatus,
} from '@n8n/api-types';
import { Agent as RuntimeAgent, Tool, type SerializableAgentState } from '@n8n/agents';
import { createTeamProject, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { AgentsConfig, AiConfig } from '@n8n/config';
import { UserRepository, type OperationContext, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, EntityManager } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import chunk from 'lodash/chunk';
import type { ErrorReporter, StorageConfig } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { createRequire } from 'node:module';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { Telemetry } from '@/telemetry';
import type { ExternalHooks } from '@/external-hooks';
import { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import type { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import type { AgentRunTracingService } from '@/modules/agents/agent-run-tracing.service';
import type { AgentSandboxRuntimeService } from '@/modules/agents/agent-sandbox-runtime.service';
import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '@/modules/agents/agent-sandbox-principal';
import type { IntegrationMessageContextService } from '@/modules/agents/integrations/integration-message-context.service';
import type { AgentChatAttachmentService } from '@/modules/agents/agent-chat-attachment.service';
import type { AgentChatExecutionService } from '@/modules/agents/agent-chat-execution.service';
import { buildInboundUserMessage } from '@/modules/agents/utils/inbound-attachments';
import { executionsToMessagesDto } from '@/modules/agents/utils/execution-to-message-mapper';
import { formatPreviewSessionContext } from '@/modules/agents/builder/format-preview-context';
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import type { AgentExecutionUpdateBroadcaster } from '@/modules/agents/agent-execution-update-broadcaster';
import { AgentInterruptedExecutionSweeper } from '@/modules/agents/agent-interrupted-execution-sweeper';
import { AgentTurnExecutionService } from '@/modules/agents/agent-turn-execution.service';
import type { AgentExecutionStreamChunk } from '@/modules/agents/types/agent-steering';
import {
	AgentMessageQueueService,
	type ClaimedAgentMessage,
} from '@/modules/agents/agent-message-queue.service';
import {
	AgentMessageIdConflictError,
	AgentMessageRepository,
} from '@/modules/agents/repositories/agent-message.repository';
import { AgentResourceEntity } from '@/modules/agents/entities/agent-resource.entity';
import { AgentThreadRepository } from '@/modules/agents/repositories/agent-thread.repository';
import { AgentExecutionMessageLink } from '@/modules/agents/entities/agent-execution-message-link.entity';
import { AgentMessageSteeringService } from '@/modules/agents/agent-message-steering.service';
import { AgentMessageQueueRepository } from '@/modules/agents/repositories/agent-message-queue.repository';
import { AgentTurnAlreadyRunningError } from '@/modules/agents/agent-turn-already-running.error';
import {
	EXECUTION_METADATA_KEY,
	type AgentExecutionAdmission,
	type QueuedIntegrationMessage,
} from '@/modules/agents/types/agent-queued-message';
import type { AgentBackgroundJobService } from '@/modules/agents/background/agent-background-job.service';
import type { AgentWakeService } from '@/modules/agents/background/agent-wake.service';
import { ExecutionRecorder, type TimelineEvent } from '@/modules/agents/execution-recorder';
import type { AgentExecutionLogStore } from '@/modules/agents/execution-log/agent-execution-log-store';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentChatAttachment } from '@/modules/agents/entities/agent-chat-attachment.entity';
import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import type { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentChatAttachmentRepository } from '@/modules/agents/repositories/agent-chat-attachment.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { N8N_CHAT_PRODUCTION_SOURCE } from '@/modules/agents/utils/agent-thread-access';

import { createMember, createAdmin } from '../../shared/db/users';

// Share the transaction class loaded by the built BaseRepository.
const { TypeOrmTransaction, TypeOrmTransactionRunner } = createRequire(__filename)(
	'@n8n/db/dist/services/typeorm-transaction',
) as typeof import('@n8n/db/dist/services/typeorm-transaction');

describe('AgentExecutionRepository', () => {
	const viewerId = uuid();
	let repository: AgentExecutionRepository;
	let threadRepo: AgentExecutionThreadRepository;
	let agentRepo: AgentRepository;
	let attachmentRepo: AgentChatAttachmentRepository;
	let peer: DataSource;
	let projectId: string;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentExecutionRepository);
		threadRepo = Container.get(AgentExecutionThreadRepository);
		agentRepo = Container.get(AgentRepository);
		attachmentRepo = Container.get(AgentChatAttachmentRepository);
		peer = await new DataSource({
			...repository.manager.connection.options,
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
			logger: 'simple-console',
			logging: false,
		}).initialize();
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		projectId = project.id;

		const agent = agentRepo.create({
			id: uuid(),
			name: 'Test Agent',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
		} as Partial<Agent>);
		await agentRepo.save(agent);
		agentId = agent.id;
	});

	afterEach(async () => {
		await Container.get(AgentMessageQueueRepository).delete({});
		await repository.delete({});
		await threadRepo.delete({});
		await agentRepo.delete({});
		await Container.get(AgentThreadRepository).delete({});
	});

	afterAll(async () => {
		if (peer?.isInitialized) await peer.destroy();
		await testDb.terminate();
	});

	function recordingServices(
		memoryBackend: ReturnType<N8nMemory['getImplementation']> = mock(),
		connection?: DataSource,
	) {
		const txRunner = new TypeOrmTransactionRunner(
			connection ?? repository.manager.connection,
			mockLogger(),
		);
		const executions = connection ? new AgentExecutionRepository(connection, txRunner) : repository;
		const threads = connection
			? new AgentExecutionThreadRepository(connection, txRunner)
			: threadRepo;
		const queueRepository = new AgentMessageQueueRepository(
			connection ?? repository.manager.connection,
			txRunner,
		);
		const checkpointStorage = new N8NCheckpointStorage(
			new AgentCheckpointRepository(connection ?? repository.manager.connection, txRunner),
			mockLogger(),
			new AgentsConfig(),
			txRunner,
			executions,
			threads,
			queueRepository,
		);
		const messageRepository = new AgentMessageRepository(
			connection ?? repository.manager.connection,
			txRunner,
		);
		const memory = mock<N8nMemory>();
		memory.getImplementation.mockReturnValue(memoryBackend);
		const attachmentService = mock<AgentChatAttachmentService>();
		const executionLogStore = mock<AgentExecutionLogStore>();
		const executionService = new AgentExecutionService(
			mockLogger(),
			executions,
			threads,
			memory,
			mock<Telemetry>(),
			attachmentService,
			executionLogStore,
			mock<StorageConfig>({ modeTag: 'db' }),
			mock<ErrorReporter>(),
			mock<AgentExecutionUpdateBroadcaster>(),
			checkpointStorage,
			txRunner,
			queueRepository,
			messageRepository,
		);
		const queueUpdates = mock<AgentExecutionUpdateBroadcaster>();
		const steering = new AgentMessageSteeringService(
			txRunner,
			queueRepository,
			threads,
			executions,
			messageRepository,
			checkpointStorage,
			executionService,
			mock<AgentExecutionUpdateBroadcaster>(),
		);
		const queue = new AgentMessageQueueService(
			txRunner,
			queueRepository,
			threads,
			executions,
			executionService,
			checkpointStorage,
			connection ? new AgentRepository(connection) : agentRepo,
			attachmentService,
			queueUpdates,
			messageRepository,
			steering,
		);
		const chatExecutionService = mock<AgentChatExecutionService>();
		chatExecutionService.settle.mockImplementation(async (_executionId, finalize) => {
			await finalize();
		});
		return {
			steering,
			txRunner,
			threads,
			queue,
			queueUpdates,
			queueRepository,
			checkpointStorage,
			executionService,
			messageRepository,
			attachmentService,
			executionLogStore,
			turns: new AgentTurnExecutionService(
				mockLogger(),
				executionService,
				chatExecutionService,
				queue,
				steering,
			),
		};
	}

	async function enqueue(
		services: ReturnType<typeof recordingServices>,
		input: Parameters<AgentMessageQueueService['enqueue']>[0],
	) {
		const result = await services.queue.enqueue(input);
		if (result.status !== 'accepted') throw new Error('Expected queue acceptance');
		return result.item;
	}

	function observePeerTransaction() {
		const started = createDeferredPromise();
		const querySpy = vi.spyOn(peer.logger, 'logQuery').mockImplementation((query) => {
			if (query === 'START TRANSACTION' || query === 'BEGIN IMMEDIATE TRANSACTION') {
				started.resolve();
			}
		});
		return { started: started.promise, restore: () => querySpy.mockRestore() };
	}

	async function waitForPeerLock(ctx: OperationContext) {
		if (peer.options.type !== 'postgres') return;
		const transaction = ctx.trx;
		if (!(transaction instanceof TypeOrmTransaction)) throw new Error('Expected a transaction');
		await vi.waitFor(async () => {
			const rows = await transaction.getEntityManager().query<Array<{ blocked: boolean }>>(
				`SELECT EXISTS (
					SELECT 1 FROM pg_stat_activity
					WHERE pg_backend_pid() = ANY(pg_blocking_pids(pid))
				) AS blocked`,
			);
			expect(rows).toEqual([{ blocked: true }]);
		});
	}

	function buildAttachment(threadId: string) {
		return attachmentRepo.create({
			id: generateNanoId(),
			agentId,
			projectId,
			threadId,
			binaryDataId: `attachment:${uuid()}`,
			fileName: 'attachment.txt',
			mimeType: 'text/plain',
			fileSizeBytes: 1,
			source: 'chat',
		});
	}

	function insertAttachmentAfterSnapshot(attachment: AgentChatAttachment) {
		const find = EntityManager.prototype.find;
		const spy = vi.spyOn(EntityManager.prototype, 'find').mockImplementation(async function (
			this: EntityManager,
			target,
			options,
		) {
			const rows = await find.call(this, target, options);
			if (target === AgentChatAttachment) {
				spy.mockRestore();
				await this.save(AgentChatAttachment, attachment);
			}
			return rows;
		});
		return spy;
	}

	async function collect(stream: AsyncIterable<AgentExecutionStreamChunk>) {
		const chunks: AgentExecutionStreamChunk[] = [];
		for await (const chunk of stream) chunks.push(chunk);
		return chunks;
	}

	function checkpointStateWithChildren(
		state: string,
		threadId: string,
		children: Array<{ runId: string; agentId: string; threadId: string }>,
	): string {
		const checkpoint = jsonParse<SerializableAgentState>(state);
		const pendingToolCalls = Object.fromEntries(
			children.map((child, index) => [
				`delegated-${index}`,
				{
					toolCallId: `delegated-${index}`,
					toolName: 'delegate_subagent',
					input: {},
					suspended: true,
					runId: `parent-${index}`,
					resumeSchema: { type: 'object' },
					suspendPayload: { type: 'approval' },
					continuation: {
						runId: child.runId,
						toolCallId: `child-${index}`,
						taskPath: `/root/child_${index}`,
						subAgentId: child.agentId,
						childCount: index,
						threadId: child.threadId,
						resumeContext: { agentId: child.agentId },
					},
				},
			]),
		);
		return JSON.stringify({
			...checkpoint,
			persistence: { ...checkpoint.persistence, threadId },
			pendingToolCalls: { ...checkpoint.pendingToolCalls, ...pendingToolCalls },
		});
	}

	function createApprovalAgentFactory(threadId: string, ownerId?: string, approvals = 1) {
		type ModelStreamPart = Awaited<
			ReturnType<MockLanguageModelV3['doStream']>
		>['stream'] extends ReadableStream<infer Part>
			? Part
			: never;
		let modelCalls = 0;
		const model = new MockLanguageModelV3({
			provider: 'mock',
			modelId: 'recorded-turn',
			doStream: async () => {
				expect(await repository.existsRunningByThread(threadId)).toBe(true);
				if (ownerId) {
					expect(await threadRepo.findOneByOrFail({ id: threadId })).toMatchObject({
						accessScope: 'user',
						ownerId,
					});
				}
				const call = modelCalls++;
				const first = call < approvals;
				return {
					stream: convertArrayToReadableStream<ModelStreamPart>([
						{ type: 'stream-start', warnings: [] },
						...(first
							? [
									{
										type: 'tool-call' as const,
										toolCallId: `approval-${call + 1}`,
										toolName: 'approve',
										input: '{}',
									},
								]
							: [
									{ type: 'text-start' as const, id: 'answer' },
									{ type: 'text-delta' as const, id: 'answer', delta: 'Done' },
									{ type: 'text-end' as const, id: 'answer' },
								]),
						{
							type: 'finish',
							finishReason: { unified: first ? 'tool-calls' : 'stop', raw: undefined },
							usage: {
								inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
								outputTokens: { total: 1, text: 1, reasoning: 0 },
							},
						},
					]),
				};
			},
		});
		const action = vi.fn();
		const tool = new Tool('approve')
			.description('Approve the action')
			.input(z.object({}))
			.suspend(z.object({}))
			.resume(z.object({ approved: z.boolean() }))
			.handler(async (_input, ctx) => {
				if (!ctx.resumeData) return await ctx.suspend({});
				action();
				return 'approved';
			});
		const makeAgent = (store: ReturnType<N8NCheckpointStorage['getStorage']>) =>
			new RuntimeAgent('Test Agent')
				.instructions('Use the approval tool.')
				.model(model)
				.tool(tool)
				.memory(Container.get(N8nMemory).getImplementation(agentId))
				.checkpoint(store);
		return { action, makeAgent, model };
	}

	async function startSuspendedApprovalRun(user?: User, approvals = 1) {
		const { turns, executionService, checkpointStorage: storage } = recordingServices();
		const threadId = uuid();
		const recording = {
			access: user
				? { accessScope: 'user' as const, ownerId: user.id }
				: { accessScope: 'project' as const, ownerId: null },
			threadId,
			agentId,
			agentName: 'Test Agent',
			projectId,
			userMessage: 'Start',
			resourceId: user ? `draft-chat:${user.id}` : 'user-1',
		};
		const checkpointRepo = Container.get(AgentCheckpointRepository);
		const { action, makeAgent, model } = createApprovalAgentFactory(threadId, user?.id, approvals);
		const common = {
			toolRegistry: new Map(),
			mcpServerAttributions: new Map(),
			context: recording,
		};
		const agent = makeAgent(storage.getStorage(agentId));
		const chunks = await collect(
			turns.execute({
				...common,
				agentInstance: agent,
				prepare: async () => ({
					type: 'start',
					input: 'Start',
					options: {
						persistence: {
							threadId,
							resourceId: user ? `draft-chat:${user.id}` : 'user-1',
							...(user
								? {
										hostMetadata: encodeAgentSandboxHostMetadata({
											projectId,
											principalHash: hashAgentSandboxPrincipal({
												type: 'n8n-user',
												userId: user.id,
											}),
										}),
									}
								: {}),
						},
					},
					recording,
				}),
			}),
		);
		await agent.close();
		const suspension = chunks.find((chunk) => chunk.type === 'tool-call-suspended');
		expect(suspension).toBeDefined();
		if (!suspension || suspension.type !== 'tool-call-suspended') {
			throw new Error('Expected suspension');
		}

		return {
			action,
			model,
			executionService,
			checkpointRepo,
			common,
			makeAgent,
			recording,
			storage,
			suspension,
			threadId,
			turns,
		};
	}

	async function resumeApprovalFromSeparateConnections(
		fixture: Awaited<ReturnType<typeof startSuspendedApprovalRun>>,
	) {
		const { common, makeAgent, recording, storage, suspension, turns } = fixture;
		const { checkpointStorage: otherStorage, turns: otherTurns } = recordingServices(
			undefined,
			peer,
		);
		const admitted = createDeferredPromise<OperationContext>();
		const releaseAdmission = createDeferredPromise();
		const save = repository.saveInContext.bind(repository);
		const saveSpy = vi
			.spyOn(repository, 'saveInContext')
			.mockImplementationOnce(async (execution, ctx) => {
				const saved = await save(execution, ctx);
				admitted.resolve(ctx);
				await releaseAdmission.promise;
				return saved;
			});
		const competing = observePeerTransaction();
		try {
			const onResumeClaimed = vi.fn();
			const attempts = [
				{ storage, turns },
				{ storage: otherStorage, turns: otherTurns },
			].map(async ({ storage: checkpointStorage, turns: executingTurns }, index) => {
				if (index === 1) await admitted.promise;
				let agent: ReturnType<typeof makeAgent> | undefined;
				try {
					agent = makeAgent(checkpointStorage.getStorage(agentId));
					return await collect(
						executingTurns.execute({
							...common,
							agentInstance: agent,
							prepare: async () => ({
								type: 'resume',
								resumeData: { approved: true },
								options: {
									runId: suspension.runId,
									toolCallId: suspension.toolCallId,
									onResumeClaimed,
								},
								recording: { ...recording, userMessage: null, sessionMode: 'existing' },
							}),
						}),
					);
				} finally {
					await agent?.close();
				}
			});

			const outcomes = Promise.allSettled(attempts);
			const ctx = await admitted.promise;
			await competing.started;
			await waitForPeerLock(ctx);
			releaseAdmission.resolve();
			return { outcomes: await outcomes, onResumeClaimed };
		} finally {
			releaseAdmission.resolve();
			saveSpy.mockRestore();
			competing.restore();
		}
	}

	it('clears retained delegated state with missing and cyclic references', async () => {
		const { threadId, suspension, checkpointRepo, storage } = await startSuspendedApprovalRun();
		const state = (await checkpointRepo.findByRunId(suspension.runId))!.state;
		if (!state) throw new Error('Expected checkpoint state');
		const child = { runId: uuid(), agentId, threadId: uuid() };
		const nested = { runId: uuid(), agentId, threadId: uuid() };
		const missing = { runId: uuid(), agentId, threadId: uuid() };
		await checkpointRepo.update(
			{ runId: suspension.runId },
			{ state: checkpointStateWithChildren(state, threadId, [child]) },
		);
		await checkpointRepo.insert([
			{
				...child,
				expired: true,
				state: checkpointStateWithChildren(state, child.threadId, [missing, nested]),
			},
			{
				...nested,
				expired: false,
				state: checkpointStateWithChildren(state, nested.threadId, [
					{ runId: suspension.runId, agentId, threadId },
				]),
			},
		]);

		await storage.deleteDelegatedForThread(agentId, threadId);

		for (const runId of [suspension.runId, child.runId, nested.runId]) {
			expect(await checkpointRepo.findByRunId(runId)).toMatchObject({
				expired: true,
				state: null,
			});
		}
	});

	it('removes retained and delegated checkpoints without deleting child history', async () => {
		const { threadId, suspension, checkpointRepo, storage } = await startSuspendedApprovalRun();
		const { executionService } = recordingServices();
		const state = (await checkpointRepo.findByRunId(suspension.runId))!.state;
		if (!state) throw new Error('Expected checkpoint state');
		const retainedRunId = uuid();
		const childRunId = uuid();
		const nestedRunId = uuid();
		const otherThreadRunId = uuid();
		const otherAgentRunId = uuid();
		const otherAgent = await agentRepo.save(
			agentRepo.create({
				id: uuid(),
				name: 'Other Agent',
				projectId,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);
		const childThread = await createThread({
			id: uuid(),
			agentId: otherAgent.id,
			agentName: otherAgent.name,
			sessionNumber: 2,
			parentThreadId: threadId,
			parentAgentId: agentId,
		});
		const childExecution = await createExecution({
			threadId: childThread.id,
			userMessage: 'Child task',
		});
		const parentState = checkpointStateWithChildren(state, threadId, [
			{ runId: childRunId, agentId: otherAgent.id, threadId: childThread.id },
		]);
		const childState = checkpointStateWithChildren(state, childThread.id, [
			{ runId: nestedRunId, agentId: otherAgent.id, threadId: childThread.id },
			{ runId: suspension.runId, agentId, threadId },
		]);
		await checkpointRepo.update({ runId: suspension.runId }, { state: parentState });
		await checkpointRepo.insert([
			{ runId: retainedRunId, agentId, threadId, expired: true, state: parentState },
			{
				runId: childRunId,
				agentId: otherAgent.id,
				threadId: childThread.id,
				expired: false,
				state: childState,
			},
			{
				runId: nestedRunId,
				agentId: otherAgent.id,
				threadId: childThread.id,
				expired: true,
				state,
			},
			{ runId: otherThreadRunId, agentId, threadId: uuid(), expired: false, state },
			{ runId: otherAgentRunId, agentId: otherAgent.id, threadId, expired: false, state },
		]);
		const before = await checkpointRepo.find({ order: { runId: 'ASC' } });
		const otherProject = await createTeamProject();
		const userId = uuid();

		expect(await executionService.deleteThread(projectId, otherAgent.id, threadId, userId)).toBe(
			false,
		);
		expect(await executionService.deleteThread(otherProject.id, agentId, threadId, userId)).toBe(
			false,
		);
		expect(await checkpointRepo.find({ order: { runId: 'ASC' } })).toEqual(before);
		expect(await executionService.deleteThread(projectId, agentId, threadId, userId)).toBe(true);

		for (const runId of [suspension.runId, retainedRunId, childRunId, nestedRunId]) {
			expect(await checkpointRepo.findByRunId(runId)).toBeNull();
		}
		for (const runId of [otherThreadRunId, otherAgentRunId]) {
			expect(await checkpointRepo.findByRunId(runId)).toEqual(
				before.find((row) => row.runId === runId),
			);
		}
		expect(await threadRepo.findOneBy({ id: threadId })).toBeNull();
		expect(await repository.findByThreadIdOrdered(threadId)).toEqual([]);
		expect(await threadRepo.findOneBy({ id: childThread.id })).toMatchObject({
			id: childThread.id,
		});
		expect(await repository.findOneBy({ id: childExecution.id })).toMatchObject({
			id: childExecution.id,
			threadId: childThread.id,
		});
		expect(await storage.getStatus(suspension.runId, agentId)).toEqual({ status: 'not-found' });
	});

	it('removes a large batch of delegated checkpoints', async () => {
		const { threadId, suspension, checkpointRepo } = await startSuspendedApprovalRun();
		const { executionService } = recordingServices();
		const state = (await checkpointRepo.findByRunId(suspension.runId))!.state;
		if (!state) throw new Error('Expected checkpoint state');
		const childThreadId = uuid();
		const children = Array.from({ length: 1_000 }, () => ({
			runId: uuid(),
			agentId,
			threadId: childThreadId,
		}));

		await checkpointRepo.update(
			{ runId: suspension.runId },
			{ state: checkpointStateWithChildren(state, threadId, children) },
		);
		const childCheckpoints = children.map(({ runId }) => ({
			runId,
			agentId,
			threadId: childThreadId,
			expired: false,
			state,
		}));
		for (const batch of chunk(childCheckpoints, 400)) await checkpointRepo.insert(batch);

		expect(await executionService.deleteThread(projectId, agentId, threadId, uuid())).toBe(true);
		expect(await checkpointRepo.findByRunId(suspension.runId)).toBeNull();
		expect(await checkpointRepo.find({ where: { threadId: childThreadId } })).toEqual([]);
	});

	it.each([0, 1])('keeps attachments added after reading %i attachment rows', async (count) => {
		const thread = await createThread();
		const otherThread = await createThread({ sessionNumber: 2 });
		const captured = Array.from({ length: count }, () => buildAttachment(thread.id));
		const late = buildAttachment(thread.id);
		const unrelated = buildAttachment(otherThread.id);
		await attachmentRepo.save([...captured, unrelated]);
		const { executionService, attachmentService } = recordingServices();
		const interceptor = insertAttachmentAfterSnapshot(late);

		try {
			expect(await executionService.deleteThread(projectId, agentId, thread.id, uuid())).toBe(true);
		} finally {
			interceptor.mockRestore();
		}

		expect(await attachmentRepo.findByThread(thread.id, { projectId })).toMatchObject([
			{ id: late.id, binaryDataId: late.binaryDataId },
		]);
		expect(await attachmentRepo.findOneBy({ id: unrelated.id })).toEqual(unrelated);
		expect(await threadRepo.findOneBy({ id: thread.id })).toBeNull();
		expect(attachmentService.deleteStoredData).toHaveBeenCalledExactlyOnceWith(
			captured.map(({ binaryDataId }) => binaryDataId),
			{ threadId: thread.id },
		);
	});

	it('rolls back session database cleanup when memory cleanup fails', async () => {
		const { threadId, suspension, checkpointRepo } = await startSuspendedApprovalRun();
		const attachment = await attachmentRepo.save(buildAttachment(threadId));
		const memoryBackend = mock<ReturnType<N8nMemory['getImplementation']>>();
		memoryBackend.deleteThread.mockRejectedValue(new Error('Memory cleanup failed'));
		const { executionService, attachmentService, executionLogStore } =
			recordingServices(memoryBackend);
		const executionsBefore = await repository.findByThreadIdOrdered(threadId);

		await expect(
			executionService.deleteThread(projectId, agentId, threadId, uuid()),
		).rejects.toThrow('Memory cleanup failed');

		expect(await checkpointRepo.findByRunId(suspension.runId)).not.toBeNull();
		expect(await threadRepo.findOneBy({ id: threadId })).not.toBeNull();
		expect(await repository.findByThreadIdOrdered(threadId)).toEqual(executionsBefore);
		expect(await attachmentRepo.findOneBy({ id: attachment.id })).toEqual(attachment);
		expect(attachmentService.deleteStoredData).not.toHaveBeenCalled();
		expect(executionLogStore.delete).not.toHaveBeenCalled();
	});

	it('keeps session data when admission wins deletion on another connection', async () => {
		const thread = await createThread();
		const attachment = await attachmentRepo.save(buildAttachment(thread.id));
		const checkpointRepo = Container.get(AgentCheckpointRepository);
		const checkpoint = await checkpointRepo.save({
			runId: uuid(),
			agentId,
			threadId: thread.id,
			state: '{}',
			expired: false,
		});
		const { turns } = recordingServices();
		const memoryBackend = mock<ReturnType<N8nMemory['getImplementation']>>();
		const { executionService, attachmentService, executionLogStore } = recordingServices(
			memoryBackend,
			peer,
		);
		const params = {
			access: { accessScope: 'project' as const, ownerId: null },
			threadId: thread.id,
			agentId,
			agentName: 'Test Agent',
			projectId,
			userMessage: 'Continue',
			resourceId: 'user-1',
			sessionMode: 'existing' as const,
		};
		const recorder = new ExecutionRecorder();
		const admitted = createDeferredPromise<OperationContext>();
		const releaseAdmission = createDeferredPromise();
		const saveInContext = repository.saveInContext.bind(repository);
		const saveSpy = vi
			.spyOn(repository, 'saveInContext')
			.mockImplementationOnce(async (execution, ctx) => {
				const saved = await saveInContext(execution, ctx);
				admitted.resolve(ctx);
				await releaseAdmission.promise;
				return saved;
			});
		const competing = observePeerTransaction();
		try {
			const start = turns.startExecution(params, recorder.startedAt);
			const ctx = await admitted.promise;
			const deletion = executionService.deleteThread(projectId, agentId, thread.id, uuid());
			const rejected = expect(deletion).rejects.toMatchObject({ httpStatusCode: 409 });
			await competing.started;
			await waitForPeerLock(ctx);
			releaseAdmission.resolve();
			const { executionId } = await start;
			await rejected;

			expect(await threadRepo.findOneBy({ id: thread.id })).not.toBeNull();
			expect(await repository.findByThreadIdOrdered(thread.id)).toEqual([
				expect.objectContaining({ id: executionId, status: 'running' }),
			]);
			expect(await checkpointRepo.findByRunId(checkpoint.runId)).toEqual(checkpoint);
			expect(await attachmentRepo.findOneBy({ id: attachment.id })).toEqual(attachment);
			expect(memoryBackend.deleteThread).not.toHaveBeenCalled();
			expect(attachmentService.deleteStoredData).not.toHaveBeenCalled();
			expect(executionLogStore.delete).not.toHaveBeenCalled();

			recorder.record({ type: 'finish', finishReason: 'stop' });
			await turns.finalizeExecution({
				executionId,
				executionStarted: true,
				params: { ...params, record: recorder.getMessageRecord() },
			});
		} finally {
			releaseAdmission.resolve();
			saveSpy.mockRestore();
			competing.restore();
		}
	});

	it('rejects a continuation before SDK execution when deletion on another connection wins', async () => {
		const thread = await createThread();
		const { executionService } = recordingServices();
		const { turns } = recordingServices(mock(), peer);
		const agent = mock<RuntimeAgent>();
		const deleted = createDeferredPromise<OperationContext>();
		const releaseDeletion = createDeferredPromise();
		const deleteSession = threadRepo.deleteSession.bind(threadRepo);
		const deleteSpy = vi
			.spyOn(threadRepo, 'deleteSession')
			.mockImplementationOnce(async (...args) => {
				const result = await deleteSession(...args);
				deleted.resolve(args[4]);
				await releaseDeletion.promise;
				return result;
			});
		const competing = observePeerTransaction();
		try {
			const deletion = executionService.deleteThread(projectId, agentId, thread.id, uuid());
			const ctx = await deleted.promise;
			const continuation = collect(
				turns.execute({
					agentInstance: agent,
					toolRegistry: new Map(),
					mcpServerAttributions: new Map(),
					context: { projectId, agentId, threadId: thread.id },
					prepare: async () => ({
						type: 'start',
						input: 'Continue',
						options: {},
						recording: {
							access: { accessScope: 'project', ownerId: null },
							threadId: thread.id,
							agentId,
							agentName: 'Test Agent',
							projectId,
							userMessage: 'Continue',
							resourceId: 'user-1',
							sessionMode: 'existing',
						},
					}),
				}),
			);
			const rejected = expect(continuation).rejects.toMatchObject({
				phase: 'create',
				cause: expect.objectContaining({ message: 'Session not found' }),
			});
			await competing.started;
			await waitForPeerLock(ctx);
			releaseDeletion.resolve();
			expect(await deletion).toBe(true);
			await rejected;
			expect(agent.stream).not.toHaveBeenCalled();
			expect(await threadRepo.findOneBy({ id: thread.id })).toBeNull();
			expect(await repository.findByThreadIdOrdered(thread.id)).toEqual([]);
		} finally {
			releaseDeletion.resolve();
			deleteSpy.mockRestore();
			competing.restore();
		}
	});

	it('converges concurrent creation of the same session without changing ownership', async () => {
		const { txRunner } = recordingServices();
		const { txRunner: peerRunner, threads: peerThreads } = recordingServices(mock(), peer);
		const threadId = uuid();
		const access = { accessScope: 'project' as const, ownerId: null };
		const inserted = createDeferredPromise<OperationContext>();
		const releaseInsert = createDeferredPromise();
		const competing = observePeerTransaction();
		try {
			const first = txRunner.run({}, async (ctx) => {
				const result = await threadRepo.findOrCreate(
					threadId,
					agentId,
					'Test Agent',
					projectId,
					access,
					ctx,
				);
				inserted.resolve(ctx);
				await releaseInsert.promise;
				return result;
			});
			const ctx = await inserted.promise;
			const second = peerRunner.run(
				{},
				async (peerCtx) =>
					await peerThreads.findOrCreate(
						threadId,
						agentId,
						'Other request name',
						projectId,
						access,
						peerCtx,
					),
			);
			await competing.started;
			await waitForPeerLock(ctx);
			releaseInsert.resolve();
			const results = await Promise.all([first, second]);
			expect(results.map(({ created }) => created)).toEqual([true, false]);
			expect(results[1].thread).toEqual(results[0].thread);
			expect(await threadRepo.countBy({ id: threadId })).toBe(1);
		} finally {
			releaseInsert.resolve();
			competing.restore();
		}
	});

	it('admits one resume when separate connections claim the same checkpoint', async () => {
		const fixture = await startSuspendedApprovalRun();
		const { outcomes, onResumeClaimed } = await resumeApprovalFromSeparateConnections(fixture);

		expect(outcomes.map(({ status }) => status).sort()).toEqual(['fulfilled', 'rejected']);
		expect(onResumeClaimed).toHaveBeenCalledOnce();
		expect(fixture.action).toHaveBeenCalledOnce();
		const executions = await repository.findByThreadIdOrdered(fixture.threadId);
		expect(executions).toHaveLength(2);
		expect(executions.map(({ status }) => status)).toEqual(['success', 'success']);
		const resumed = executions.find(({ hitlStatus }) => hitlStatus === 'resumed');
		expect(resumed).toMatchObject({ userMessage: null, status: 'success' });
		expect(resumed?.timeline).toContainEqual(expect.objectContaining({ type: 'hitl-response' }));
		const links = await repository.manager.find(AgentExecutionMessageLink, {
			order: { position: 'ASC' },
		});
		const inputs = links.filter(({ direction }) => direction === 'input');
		expect(inputs).toHaveLength(2);
		expect(new Set(inputs.map(({ messageId }) => messageId)).size).toBe(1);
		const outputs = links.filter(({ direction }) => direction === 'output');
		const sharedOutput = outputs.find(({ executionId }) => executionId === executions[0].id);
		expect(sharedOutput).toBeDefined();
		expect(outputs).toContainEqual(
			expect.objectContaining({
				executionId: executions[1].id,
				messageId: sharedOutput?.messageId,
				position: 0,
			}),
		);
		const detail = await fixture.executionService.getThreadDetail(
			fixture.threadId,
			projectId,
			agentId,
			viewerId,
		);
		expect(detail?.executions.map(({ inputMessageIds }) => inputMessageIds)).toEqual([
			[inputs[0].messageId],
			[inputs[0].messageId],
		]);
		expect(
			executionsToMessagesDto(detail!.executions).filter(({ role }) => role === 'user'),
		).toHaveLength(1);
		const context = formatPreviewSessionContext(
			detail!.thread,
			detail!.executions,
			executions[1].id,
		);
		expect(context).toContain('scope: single turn, turns: 2');
		expect(context?.match(/User: Start/g)).toHaveLength(1);
		expect(
			fixture.model.doStreamCalls[0].prompt.filter(({ role }) => role === 'user'),
		).toHaveLength(1);

		expect(await fixture.checkpointRepo.findByRunId(fixture.suspension.runId)).toMatchObject({
			expired: true,
			state: null,
		});
	});

	it('resumes a legacy checkpoint without creating message references or duplicating input history', async () => {
		const fixture = await startSuspendedApprovalRun();
		const [legacy] = await repository.findByThreadIdOrdered(fixture.threadId);
		// Pre-migration executions and checkpoints have no exact message links.
		await repository.update(legacy.id, { userMessage: 'Start' });
		await repository.manager.delete(AgentExecutionMessageLink, { executionId: legacy.id });
		const { outcomes } = await resumeApprovalFromSeparateConnections(fixture);
		expect(outcomes.map(({ status }) => status).sort()).toEqual(['fulfilled', 'rejected']);
		expect(fixture.action).toHaveBeenCalledOnce();
		expect(await repository.manager.count(AgentExecutionMessageLink)).toBe(0);
		const detail = await fixture.executionService.getThreadDetail(
			fixture.threadId,
			projectId,
			agentId,
			viewerId,
		);
		expect(detail?.executions.map(({ inputMessageIds }) => inputMessageIds)).toEqual([
			undefined,
			undefined,
		]);
		expect(
			executionsToMessagesDto(detail!.executions).filter(({ role }) => role === 'user'),
		).toMatchObject([{ id: `${legacy.id}:user`, content: [{ type: 'text', text: 'Start' }] }]);
		expect(
			formatPreviewSessionContext(detail!.thread, detail!.executions, detail!.executions[1].id),
		).toContain('scope: single turn, turns: 2');
	});

	it.each([false, true])(
		'keeps a preview resume unchanged for another caller with sandbox=%s',
		async (sandboxEnabled) => {
			const owner = await createMember();
			const other = await createAdmin();
			const fixture = await startSuspendedApprovalRun(owner, 2);
			const { storage, checkpointRepo, executionService, turns, threadId, suspension } = fixture;
			const runtimeCache = mock<AgentRuntimeCacheService>();
			const runtime = fixture.makeAgent(storage.getStorage(agentId));
			runtimeCache.getRuntime.mockResolvedValue({
				agent: runtime,
				toolRegistry: new Map(),
				mcpServerAttributions: new Map(),
				projectId,
				agentId,
				toolAccessCheckedAt: Date.now(),
				telemetryConfiguration: {
					model: 'mock',
					channels: [],
					tool_types: [],
					tool_count: 0,
					num_skills: 0,
					memory_type: 'none',
				},
			});
			const orchestrator = new AgentExecutionOrchestratorService(
				mockLogger(),
				storage,
				executionService,
				turns,
				mock<Telemetry>(),
				runtimeCache,
				mock<IntegrationMessageContextService>(),
				mock<AgentRunTracingService>(),
				mock<ExternalHooks>(),
				mock<AgentSandboxRuntimeService>({ isEnabled: () => sandboxEnabled }),
				agentRepo,
				new AiConfig(),
				mock<AgentChatExecutionService>(),
			);
			const resume = async (
				user: User,
				runId = suspension.runId,
				toolCallId = suspension.toolCallId,
			) =>
				await collect(
					orchestrator.resumeForChat({
						agentId,
						projectId,
						runId,
						toolCallId,
						resumeData: { approved: true },
						user,
						usePublishedVersion: false,
					}),
				);
			try {
				const checkpoint = await checkpointRepo.findByRunId(suspension.runId);
				const executions = await repository.findByThreadIdOrdered(threadId);
				await expect(resume(other)).rejects.toThrow('does not belong to this chat');
				expect(await checkpointRepo.findByRunId(suspension.runId)).toEqual(checkpoint);
				expect(await repository.findByThreadIdOrdered(threadId)).toEqual(executions);
				expect(runtimeCache.getRuntime).not.toHaveBeenCalled();
				expect(fixture.action).not.toHaveBeenCalled();

				await threadRepo.delete({ id: threadId });
				await expect(resume(other)).rejects.toThrow('does not belong to this chat');
				expect(await checkpointRepo.findByRunId(suspension.runId)).toEqual(checkpoint);
				expect(await repository.findByThreadIdOrdered(threadId)).toEqual([]);
				expect(await threadRepo.findOneBy({ id: threadId })).toBeNull();
				expect(
					await executionService.canUseDraftThread(threadId, projectId, agentId, owner.id, {
						previewChat: true,
						sessionMode: 'existing',
					}),
				).toBe(false);
				await expect(resume(owner)).rejects.toThrow('does not belong to this chat');
				expect(fixture.action).not.toHaveBeenCalled();
				expect(await threadRepo.findOneBy({ id: threadId })).toBeNull();
			} finally {
				await runtime.close();
			}
		},
	);

	it('recovers a failed finalization from the saved timeline and rejects a later terminal update', async () => {
		const { executionService, turns } = recordingServices();
		const params = {
			access: { accessScope: 'project' as const, ownerId: null },
			threadId: uuid(),
			agentId,
			agentName: 'Test Agent',
			projectId,
			userMessage: 'Run',
			resourceId: 'user-1',
		};
		const recorder = new ExecutionRecorder();
		const { executionId } = await turns.startExecution(params, recorder.startedAt);
		const timeline: TimelineEvent[] = [{ type: 'text', content: 'Saved output', timestamp: 1 }];
		executionService.recordTimelineSnapshot({ ...params, executionId, timeline });
		await vi.waitFor(async () =>
			expect((await repository.findOneByOrFail({ id: executionId })).timeline).toEqual(timeline),
		);
		recorder.record({ type: 'text-delta', id: 'text-1', delta: 'Unsaved final output' });
		recorder.record({ type: 'finish', finishReason: 'stop' });
		const record = recorder.getMessageRecord();
		// `writeTerminalExecution` retries a transient `updateIfRunning` failure
		// (3 attempts, linear backoff) before rethrowing, so a single blip is
		// recovered. To exercise the reject-and-sweeper-recovery path, every
		// retry attempt must fail: mock a persistent rejection for the duration of
		// this phase (the `finally` restores the real method before the sweeper
		// runs).
		const update = vi
			.spyOn(repository, 'updateIfRunning')
			.mockRejectedValue(new Error('database unavailable'));
		try {
			await expect(
				turns.finalizeExecution({
					executionId,
					executionStarted: true,
					params: { ...params, record },
				}),
			).rejects.toMatchObject({ phase: 'finalize', executionId });
		} finally {
			update.mockRestore();
		}
		expect(await repository.findOneByOrFail({ id: executionId })).toMatchObject({
			status: 'running',
			timeline,
		});
		await repository.update(executionId, {
			updatedAt: new Date(Date.now() - AgentInterruptedExecutionSweeper.LIVENESS_GRACE_MS - 1),
		});
		const sweeper = new AgentInterruptedExecutionSweeper(
			mockLogger(),
			repository,
			executionService,
			mock<AgentBackgroundJobService>(),
			mock<AgentWakeService>(),
			new AgentsConfig(),
		);
		await sweeper.sweep();
		const recovered = await repository.findOneByOrFail({ id: executionId });
		expect(recovered).toMatchObject({ status: 'interrupted', timeline });
		await expect(
			turns.finalizeExecution({
				executionId,
				executionStarted: true,
				params: { ...params, record },
			}),
		).rejects.toMatchObject({ phase: 'finalize', executionId });
		expect(await repository.findOneByOrFail({ id: executionId })).toEqual(recovered);
	});

	describe('durable message queue', () => {
		let owner: User;
		beforeEach(async () => {
			owner = await createMember();
		});

		function input(
			threadId: string,
			message: string,
			sessionMode: 'new' | 'existing' = 'existing',
			messageId?: string,
		): Parameters<AgentMessageQueueService['enqueue']>[0] {
			return {
				agentId,
				projectId,
				threadId,
				sessionMode,
				source: 'chat',
				payload: {
					kind: 'preview',
					message,
					userId: owner.id,
					messageId,
					resourceId: `draft-chat:${owner.id}`,
				},
			};
		}

		async function claim(services: ReturnType<typeof recordingServices>, threadId: string) {
			const item = await services.queue.claimNext(threadId, async () => true);
			if (!item) throw new Error('Expected a queue claim');
			return item;
		}

		async function finish(
			services: ReturnType<typeof recordingServices>,
			item: ClaimedAgentMessage,
			finishReason: 'stop' | 'error' | 'cancelled' = 'stop',
		) {
			const recorder = new ExecutionRecorder();
			if (finishReason === 'error') recorder.record({ type: 'error', error: new Error('Failed') });
			await services.executionService.finalizeExecution(item.admission.executionId, {
				...item.recording,
				record: { ...recorder.getMessageRecord(), finishReason },
			});
			await services.queue.settle(item.thread.id, item.admission.executionId);
		}

		it.each([
			{ automaticPreviewContinuation: false, legacy: false },
			{ automaticPreviewContinuation: true, legacy: false },
			{ automaticPreviewContinuation: false, legacy: true },
		])(
			'consumes steering through a Preview resume (automatic=$automaticPreviewContinuation, legacy=$legacy)',
			async ({ automaticPreviewContinuation, legacy }) => {
				const fixture = await startSuspendedApprovalRun(owner);
				const services = recordingServices();
				const { threadId, suspension, recording, common } = fixture;
				const [predecessor] = await repository.findByThreadIdOrdered(threadId);
				if (legacy) {
					await repository.update(predecessor.id, { userMessage: 'Start' });
					await repository.manager.delete(AgentExecutionMessageLink, {
						executionId: predecessor.id,
					});
				}
				const initialInputs = await services.messageRepository.findExecutionInputs([
					predecessor.id,
				]);
				const target = { projectId, agentId, threadId, userId: owner.id };
				const b = await enqueue(services, input(threadId, 'B'));
				const c = await enqueue(services, input(threadId, 'C'));
				const runtime = fixture.makeAgent(services.checkpointStorage.getStorage(agentId));
				let executionId = '';
				try {
					const chunks = await collect(
						services.turns.execute({
							...common,
							agentInstance: runtime,
							previewChat: true,
							automaticPreviewContinuation,
							onExecutionStarted: (id) => {
								executionId = id;
							},
							prepare: async () => ({
								type: 'resume',
								resumeData: { approved: true },
								options: {
									runId: suspension.runId,
									toolCallId: suspension.toolCallId,
									onResumeClaimed: async () => {
										await services.queue.steer({ ...target, queueId: c.id, executionId });
									},
								},
								recording: { ...recording, userMessage: null, sessionMode: 'existing' },
							}),
						}),
					);
					expect(chunks).toContainEqual(
						expect.objectContaining({
							type: 'message-steered',
							queueId: c.id,
							executionId,
							message: expect.objectContaining({
								id: c.messageId,
								content: [{ type: 'text', text: 'C' }],
							}),
						}),
					);
					expect(await repository.findOneByOrFail({ id: executionId })).toMatchObject({
						status: 'success',
						acceptsSteering: false,
						timeline: expect.arrayContaining([
							expect.objectContaining({ type: 'input', messageId: c.messageId }),
						]),
					});
					const inputs = await services.messageRepository.findExecutionInputs([executionId]);
					expect(inputs.get(executionId)?.map(({ id }) => id)).toEqual([
						...(initialInputs.get(predecessor.id) ?? []).map(({ id }) => id),
						c.messageId,
					]);
					const detail = await services.executionService.getThreadDetail(
						threadId,
						projectId,
						agentId,
						owner.id,
					);
					expect(
						executionsToMessagesDto(detail!.executions)
							.filter(({ role }) => role === 'user')
							.map(({ content }) => content),
					).toEqual([[{ type: 'text', text: 'Start' }], [{ type: 'text', text: 'C' }]]);
					expect(
						formatPreviewSessionContext(detail!.thread, detail!.executions, executionId),
					).toContain('User: Start');
					expect((await services.queue.listPending(target)).items.map(({ id }) => id)).toEqual([
						b.id,
					]);
					await finish(services, await claim(services, threadId));
				} finally {
					await runtime.close();
				}
			},
		);

		it('consumes reserved messages in acceptance order and retains their history after interruption', async () => {
			const local = recordingServices();
			const remote = recordingServices(undefined, peer);
			const threadId = uuid();
			const target = { projectId, agentId, threadId, userId: owner.id };
			await enqueue(local, input(threadId, 'A', 'new'));
			const active = await claim(local, threadId);
			const executionId = active.admission.executionId;
			const b = await enqueue(local, input(threadId, 'B'));
			const data = input(threadId, 'C', 'existing', uuid());
			data.payload.attachments = [
				{ id: 'file-c', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 3 },
			];
			const c = await enqueue(local, data);
			const original = await local.messageRepository.findOneByOrFail({ id: c.messageId });
			const d = await enqueue(local, input(threadId, 'D'));
			expect((await remote.queue.listPending(target)).items.map(({ id }) => id)).toEqual([
				b.id,
				c.id,
				d.id,
			]);
			await local.queue.steer({ ...target, queueId: d.id, executionId });
			const concurrent = await Promise.allSettled([
				local.queue.steer({ ...target, queueId: c.id, executionId }),
				remote.queue.steer({ ...target, queueId: c.id, executionId }),
			]);
			expect(concurrent.map(({ status }) => status).sort()).toEqual(['fulfilled', 'rejected']);
			expect(await remote.queue.enqueue(data)).toEqual({ status: 'duplicate' });
			await expect(
				remote.queue.steer({ ...target, userId: 'other-user', queueId: b.id, executionId }),
			).rejects.toThrow('Session not found');
			await expect(remote.queue.removePending({ ...target, queueId: c.id })).rejects.toThrow();
			await expect(
				remote.queue.updatePending({ ...target, queueId: c.id, message: 'changed' }),
			).rejects.toThrow();
			expect((await remote.queue.listPending(target)).items.map(({ id }) => id)).toEqual([
				d.id,
				c.id,
				b.id,
			]);
			expect(await remote.queue.claimNext(threadId, async () => true)).toBeNull();
			const recorder = local.turns.createRecorder(undefined, () => executionId, target);
			recorder.record({ type: 'text-delta', id: 'before', delta: 'before' });
			const outputId = uuid();
			const boundaryTimestamp = Date.now();
			const result = await local.steering.consume(
				{ ...target, executionId },
				{
					messages: [
						{
							id: active.admission.inputMessageIds[0],
							createdAt: new Date(boundaryTimestamp - 1),
							role: 'user',
							content: [
								{ type: 'text', text: 'A' },
								{
									type: 'file',
									mediaType: 'text/plain',
									data: new Uint8Array([1, 2, 3]),
									fileRef: { id: 'file-a', fileName: 'a.txt' },
								},
							],
						},
						{
							id: outputId,
							createdAt: new Date(boundaryTimestamp),
							role: 'assistant',
							content: [{ type: 'text', text: 'before' }],
						},
					],
					lastCreatedAt: boundaryTimestamp,
					completing: false,
					canContinue: true,
				},
				recorder,
				local.executionService.getAbortSignal(executionId),
			);
			expect(result.events.map(({ queueId }) => queueId)).toEqual([d.id, c.id]);
			expect(result.messages.map(({ id }) => id)).toEqual([d.messageId, c.messageId]);
			expect(result.events[1].message).toMatchObject({
				id: c.messageId,
				createdAt: original.createdAt.toISOString(),
			});
			const stored = await local.messageRepository.findBy({ threadId });
			expect(stored).toHaveLength(5);
			expect(stored.find(({ id }) => id === c.messageId)).toMatchObject({
				content: original.content,
				createdAt: original.createdAt,
				author: original.author,
				origin: original.origin,
				modelContextAt: result.messages[1].createdAt,
			});
			expect(
				(await local.messageRepository.findRuntimeMessages({ threadId })).map(({ id }) => id),
			).toEqual([active.admission.inputMessageIds[0], outputId, d.messageId, c.messageId]);
			expect(
				await repository.manager.find(AgentExecutionMessageLink, {
					where: { executionId },
					order: { direction: 'ASC', position: 'ASC' },
				}),
			).toMatchObject([
				{ messageId: active.admission.inputMessageIds[0], direction: 'input', position: 0 },
				{ messageId: d.messageId, direction: 'input', position: 1 },
				{ messageId: c.messageId, direction: 'input', position: 2 },
				{ messageId: outputId, direction: 'output', position: 0 },
			]);
			expect(await remote.queue.enqueue(data)).toEqual({ status: 'duplicate' });
			expect(JSON.stringify(stored)).not.toContain('"data"');
			expect(JSON.stringify(stored)).toContain('file-c');
			expect(local.attachmentService.deleteByIds).not.toHaveBeenCalled();
			expect((await remote.queue.listPending(target)).items.map(({ id }) => id)).toEqual([b.id]);
			await expect(
				remote.queue.steer({ ...target, queueId: c.id, executionId }),
			).rejects.toMatchObject({ httpStatusCode: 409 });
			await expect(finish(remote, active)).rejects.toThrow('no longer running');
			expect(
				(await repository.findExecution(executionId))?.timeline?.filter(
					({ type }) => type === 'input',
				),
			).toHaveLength(2);
			const cutoff = new Date(Date.now() - 120_000);
			await repository.update(executionId, { updatedAt: new Date(cutoff.getTime() - 1) });
			const abandoned = await repository.findOneByOrFail({ id: executionId });
			expect(await remote.executionService.finalizeInterruptedExecution(abandoned, cutoff)).toBe(
				true,
			);
			const next = await claim(remote, threadId);
			expect(next.item.id).toBe(b.id);
			expect(
				(await repository.findExecution(executionId))?.timeline?.filter(
					({ type }) => type === 'input',
				),
			).toHaveLength(2);
			await finish(remote, next);
		});

		it('rolls back messages and timeline markers if consumption fails', async () => {
			const services = recordingServices();
			const threadId = uuid();
			const target = { projectId, agentId, threadId, userId: owner.id };
			await enqueue(services, input(threadId, 'A', 'new'));
			const active = await claim(services, threadId);
			const executionId = active.admission.executionId;
			const c = await enqueue(services, input(threadId, 'C'));
			await services.queue.steer({ ...target, queueId: c.id, executionId });
			const before = await services.messageRepository.find({
				where: { threadId },
				order: { id: 'ASC' },
			});
			const consume = services.queueRepository.consumeSteering.bind(services.queueRepository);
			const failure = vi
				.spyOn(services.queueRepository, 'consumeSteering')
				.mockImplementationOnce(async (...args) => {
					await consume(...args);
					throw new Error('consumption failed');
				});
			const recorder = new ExecutionRecorder();
			await expect(
				services.steering.consume(
					{ ...target, executionId },
					{
						messages: [],
						lastCreatedAt: 0,
						completing: false,
						canContinue: true,
					},
					recorder,
					new AbortController().signal,
				),
			).rejects.toThrow('consumption failed');
			failure.mockRestore();
			expect(
				await services.messageRepository.find({ where: { threadId }, order: { id: 'ASC' } }),
			).toEqual(before);
			expect(
				(await services.messageRepository.findExecutionInputs([executionId]))
					.get(executionId)
					?.map(({ id }) => id),
			).toEqual(active.admission.inputMessageIds);
			expect((await repository.findExecution(executionId))?.timeline ?? []).toEqual([]);
			expect(recorder.getMessageRecord().timeline).toEqual([]);
			expect(await services.queueRepository.findOneByOrFail({ id: c.id })).toMatchObject({
				steeringExecutionId: executionId,
			});
			await finish(services, active);
		});

		it.each(['stop', 'failure', 'suspension', 'restart', 'limit'] as const)(
			'restores original FIFO positions after %s before consumption',
			async (reason) => {
				const local = recordingServices();
				const remote = recordingServices(undefined, peer);
				const threadId = uuid();
				const target = { projectId, agentId, threadId, userId: owner.id };
				await enqueue(local, input(threadId, 'A', 'new'));
				const active = await claim(local, threadId);
				const executionId = active.admission.executionId;
				const b = await enqueue(local, input(threadId, 'B'));
				const c = await enqueue(local, input(threadId, 'C'));
				await remote.queue.steer({ ...target, queueId: c.id, executionId });
				expect((await local.queue.listPending(target)).items.map(({ id }) => id)).toEqual([
					c.id,
					b.id,
				]);
				if (reason === 'stop') await remote.steering.close(threadId, executionId);
				if (reason === 'limit') {
					await local.steering.consume(
						{ ...target, executionId },
						{
							messages: [],
							lastCreatedAt: 0,
							completing: true,
							canContinue: false,
						},
						new ExecutionRecorder(),
						new AbortController().signal,
					);
				}
				if (reason === 'suspension') {
					await local.checkpointStorage.save(
						uuid(),
						{
							status: 'suspended',
							messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
							pendingToolCalls: {},
							persistence: {
								threadId,
								resourceId: `draft-chat:${owner.id}`,
								hostMetadata: { [EXECUTION_METADATA_KEY]: executionId },
							},
						},
						agentId,
					);
				}
				if (reason === 'restart') {
					const cutoff = new Date(Date.now() - 120_000);
					await repository.update(executionId, { updatedAt: new Date(cutoff.getTime() - 1) });
					await remote.executionService.finalizeInterruptedExecution(
						await repository.findOneByOrFail({ id: executionId }),
						cutoff,
					);
				} else if (reason === 'stop') {
					await finish(local, active, 'cancelled');
				} else if (reason === 'failure') {
					await finish(local, active, 'error');
				} else {
					await finish(local, active);
				}
				if (reason !== 'restart') {
					expect((await remote.queue.listPending(target)).items.map(({ id }) => id)).toEqual([
						b.id,
						c.id,
					]);
				}
				const next = await remote.queue.claimNext(threadId, async () => true);
				expect(
					(await remote.queueRepository.findOneByOrFail({ id: c.id })).steeringExecutionId,
				).toBeNull();
				await expect(
					remote.queue.steer({ ...target, queueId: c.id, executionId }),
				).rejects.toThrow();
				if (reason === 'suspension') {
					expect(next).toBeNull();
					expect((await remote.queue.listPending(target)).items.map(({ id }) => id)).toEqual([
						b.id,
						c.id,
					]);
				} else {
					expect(next?.item.id).toBe(b.id);
					await finish(remote, next!);
					await finish(remote, await claim(remote, threadId));
				}
			},
		);

		it.each(['steer', 'stop', 'completion', 'failure', 'edit', 'remove'] as const)(
			'serializes steering with %s on another database connection',
			async (operation) => {
				const local = recordingServices();
				const remote = recordingServices(undefined, peer);
				const threadId = uuid();
				await enqueue(local, input(threadId, 'A', 'new'));
				const active = await claim(local, threadId);
				const executionId = active.admission.executionId;
				const c = await enqueue(local, input(threadId, 'C'));
				const target = {
					projectId,
					agentId,
					threadId,
					userId: owner.id,
					queueId: c.id,
					executionId,
				};
				const acquired = createDeferredPromise();
				const release = createDeferredPromise();
				const lock = local.threads.lockById.bind(local.threads);
				vi.spyOn(local.threads, 'lockById').mockImplementationOnce(async (...args) => {
					const thread = await lock(...args);
					acquired.resolve();
					await release.promise;
					return thread;
				});
				const first = (async () => {
					switch (operation) {
						case 'steer':
							return await local.queue.steer(target);
						case 'stop':
							return await local.steering.close(threadId, executionId);
						case 'completion':
							return await local.steering.consume(
								target,
								{ messages: [], lastCreatedAt: 0, completing: true, canContinue: true },
								new ExecutionRecorder(),
								new AbortController().signal,
							);
						case 'failure':
							return await local.executionService.finalizeExecution(executionId, {
								...active.recording,
								record: {
									...new ExecutionRecorder().getMessageRecord(),
									finishReason: 'error',
									error: 'Failed',
								},
							});
						case 'edit':
							return await local.queue.updatePending({ ...target, message: 'edited' });
						case 'remove':
							return await local.queue.removePending(target);
					}
				})();
				await acquired.promise;
				const observe = observePeerTransaction();
				const results = Promise.allSettled([first, remote.queue.steer(target)]);
				try {
					await observe.started;
				} finally {
					release.resolve();
					observe.restore();
				}
				const settled = await results;
				expect(settled[0].status).toBe('fulfilled');
				expect(settled[1].status).toBe(operation === 'edit' ? 'fulfilled' : 'rejected');
				if (operation === 'edit')
					expect(
						(await remote.messageRepository.findOneByOrFail({ id: c.messageId })).content,
					).toEqual(buildInboundUserMessage('edited', [])[0]);
				if (operation === 'failure') {
					expect(settled[1]).toMatchObject({
						reason: { message: 'This message cannot be added to that execution' },
					});
					await local.queue.settle(threadId, executionId);
				} else {
					await finish(local, active);
				}
			},
		);

		it.each(['preview', 'integration'] as const)(
			'accepts one %s delivery across connections and rolls back the losing transaction',
			async (kind) => {
				const local = recordingServices();
				const remote = recordingServices(undefined, peer);
				const threadId = uuid();
				const original = input(threadId, 'first', 'new', uuid());
				if (kind === 'integration') {
					original.source = 'slack';
					original.payload = {
						kind,
						message: 'first',
						modelMessage: '[Ada]: first',
						resourceId: uuid(),
						author: { id: 'ada', name: 'Ada' },
						sender: { userId: 'ada', userName: 'ada', fullName: 'Ada', isBot: false, isMe: false },
						credentialId: 'credential',
						platformThreadId: 'native-thread',
						messageContext: {
							platform: 'slack',
							integrationConnectionId: 'slack:credential',
							messageId: 'native-message',
							target: { type: 'thread', threadId: 'native-thread' },
							updatedAt: new Date().toISOString(),
						},
						contextConversation: { threadId, resourceId: 'ada' },
					};
				}
				const retry = {
					...original,
					threadId: kind === 'integration' ? uuid() : threadId,
					payload: { ...original.payload, message: 'changed retry', resourceId: uuid() },
				};
				const inserted = createDeferredPromise<OperationContext>();
				const release = createDeferredPromise();
				const insert = local.queueRepository.enqueue.bind(local.queueRepository);
				vi.spyOn(local.queueRepository, 'enqueue').mockImplementationOnce(async (...args) => {
					const item = await insert(...args);
					inserted.resolve(args[3]);
					await release.promise;
					return item;
				});
				const registered = vi.fn();
				const available = vi.fn();
				local.queue.onAvailable = available;
				remote.queue.onAvailable = available;
				const competing = observePeerTransaction();
				const first = local.queue.enqueue(original, registered);
				const ctx = await inserted.promise;
				const second = remote.queue.enqueue(retry, registered);
				try {
					await competing.started;
					await waitForPeerLock(ctx);
					expect(available).not.toHaveBeenCalled();
					release.resolve();
					const result = await first;
					if (result.status !== 'accepted') throw new Error('Expected queue acceptance');
					expect(await second).toEqual({ status: 'duplicate' });
					expect(await local.queueRepository.count()).toBe(1);
					expect(await local.messageRepository.countBy({ threadId })).toBe(1);
					expect(await threadRepo.countBy({ agentId })).toBe(1);
					expect(
						await local.messageRepository.findOneByOrFail({ id: result.item.messageId }),
					).toMatchObject({ threadId, content: buildInboundUserMessage('first', [])[0] });
					expect(
						await repository.manager.findOneBy(AgentResourceEntity, {
							id: retry.payload.resourceId,
						}),
					).toBeNull();
					if (kind === 'integration') {
						expect(await threadRepo.findOneBy({ id: retry.threadId })).toBeNull();
						expect(
							await Container.get(AgentThreadRepository).findOneBy({ id: retry.threadId }),
						).toBeNull();
					}
					expect(registered).toHaveBeenCalledExactlyOnceWith(result.item.id);
					expect(available).toHaveBeenCalledExactlyOnceWith(threadId);
					expect(remote.queueUpdates.notifyQueueUpdated).not.toHaveBeenCalled();
				} finally {
					release.resolve();
					await Promise.allSettled([first, second]);
					competing.restore();
				}
			},
		);

		it('accepts identical text with separate IDs and preserves requests without an ID', async () => {
			const services = recordingServices();
			const threadId = uuid();
			for (const id of [uuid(), uuid(), undefined, undefined]) {
				await enqueue(services, input(threadId, 'same text', 'new', id));
			}
			expect(await services.messageRepository.countBy({ threadId })).toBe(4);
			expect(await services.queueRepository.countBy({ threadId })).toBe(4);
		});

		it.each(['success', 'error', 'cancelled'] as const)(
			'retains acceptance through pending, running, and %s settlement',
			async (outcome) => {
				const services = recordingServices();
				const remote = recordingServices(undefined, peer);
				const threadId = uuid();
				const data = input(threadId, 'original', 'new', uuid());
				const accepted = await enqueue(services, data);
				const original = await services.messageRepository.findOneByOrFail({
					id: accepted.messageId,
				});
				expect(await remote.queue.enqueue(data)).toEqual({ status: 'duplicate' });
				const active = await claim(services, threadId);
				expect(await remote.queue.enqueue(data)).toEqual({ status: 'duplicate' });
				if (outcome === 'error') {
					await services.queue.recordFailure(active, new Error('Model unavailable'));
					await services.queue.settle(threadId, active.admission.executionId);
				} else {
					await finish(services, active, outcome === 'cancelled' ? 'cancelled' : 'stop');
				}
				expect(await remote.queue.enqueue(data)).toEqual({ status: 'duplicate' });
				expect(await services.queueRepository.countBy({ threadId })).toBe(0);
				expect(await repository.findByThreadIdOrdered(threadId)).toMatchObject([
					{ id: active.admission.executionId, status: outcome },
				]);
				expect(
					await services.messageRepository.findOneByOrFail({ id: accepted.messageId }),
				).toEqual(original);
			},
		);

		it('lists only pending Preview input and removes its attachments without affecting the active run', async () => {
			const services = recordingServices(Container.get(N8nMemory).getImplementation(agentId));
			const threadId = uuid();
			const target = { projectId, agentId, threadId, userId: owner.id };
			await enqueue(services, input(threadId, 'active', 'new'));
			const active = await claim(services, threadId);
			const pendingInput = input(threadId, 'pending', 'existing', uuid());
			pendingInput.payload.attachments = [
				{ id: 'pending-file', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 },
			];
			const pending = await enqueue(services, pendingInput);
			const original = await services.messageRepository.findOneByOrFail({ id: pending.messageId });
			expect((await services.queue.listPending(target)).items.map(({ id }) => id)).toEqual([
				pending.id,
			]);
			await expect(
				services.queue.removePending({ ...target, queueId: active.item.id }),
			).rejects.toThrow('already started');
			await expect(
				services.queue.removePending({ ...target, userId: 'other-user', queueId: pending.id }),
			).rejects.toThrow('Session not found');
			await expect(
				services.queue.listPending({ ...target, agentId: 'other-agent' }),
			).rejects.toThrow('Session not found');
			expect(services.attachmentService.deleteByIds).not.toHaveBeenCalled();
			await services.queue.removePending({ ...target, queueId: pending.id });
			expect(await services.queue.enqueue(pendingInput)).toEqual({ status: 'duplicate' });
			expect(await services.queue.listPending(target)).toEqual({
				items: [],
				steerableExecutionId: active.admission.executionId,
			});
			expect(services.attachmentService.deleteByIds).toHaveBeenCalledWith(['pending-file']);
			expect(
				await services.messageRepository.findOneByOrFail({ id: pending.messageId }),
			).toMatchObject({
				id: original.id,
				threadId,
				resourceId: original.resourceId,
				createdAt: original.createdAt,
				origin: original.origin,
				content: { role: 'user', content: [] },
				author: null,
				modelContent: null,
				modelContextAt: null,
			});
			expect(await services.messageRepository.findRuntimeMessages({ threadId })).toEqual([]);
			expect((await repository.findOneByOrFail({ id: active.admission.executionId })).status).toBe(
				'running',
			);
			await finish(services, active);
			await services.executionService.deleteThread(projectId, agentId, threadId, owner.id);
			expect(await services.messageRepository.countBy({ threadId })).toBe(0);
		});

		it('edits pending text without changing identity, attachments, or queue position', async () => {
			const services = recordingServices();
			const threadId = uuid();
			const data = input(threadId, 'original', 'new', uuid());
			data.payload.attachments = [
				{ id: 'file', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 },
			];
			const first = await enqueue(services, data);
			await expect(
				services.queue.enqueue({
					...data,
					payload: { ...data.payload, kind: 'preview', userId: uuid() },
				}),
			).rejects.toThrow('Session not found');
			const original = await services.messageRepository.findOneByOrFail({ id: first.messageId });
			const second = await enqueue(services, input(threadId, 'second'));
			const target = {
				projectId,
				agentId,
				threadId,
				userId: owner.id,
				queueId: first.id,
				message: 'updated',
			};
			await expect(
				services.queue.updatePending({ ...target, userId: 'other-user' }),
			).rejects.toThrow('Session not found');
			await expect(
				services.queue.updatePending({ ...target, agentId: 'other-agent' }),
			).rejects.toThrow('Session not found');
			await expect(
				services.queue.updatePending({ ...target, queueId: second.id, message: ' ' }),
			).rejects.toThrow('message or attachment');
			await services.queue.updatePending({ ...target, message: ' ' });
			expect((await services.queue.listPending(target)).items[0]).toMatchObject({
				message: '',
				attachments: data.payload.attachments,
			});
			await services.queue.updatePending(target);
			expect(await services.queue.enqueue(data)).toEqual({ status: 'duplicate' });
			const stored = await services.queueRepository.findOneByOrFail({ id: first.id });
			expect(stored).toMatchObject({
				id: first.id,
				createdAt: first.createdAt,
				payload: { kind: 'preview' },
				messageId: first.messageId,
			});
			expect(stored.payload).toEqual({ kind: 'preview' });
			expect((await services.queue.listPending(target)).items.map(({ id }) => id)).toEqual([
				first.id,
				second.id,
			]);
			expect(services.attachmentService.deleteByIds).not.toHaveBeenCalled();
			const claimed = await claim(services, threadId);
			expect(claimed.payload).toEqual({
				kind: 'preview',
				message: 'updated',
				resourceId: data.payload.resourceId,
				attachments: data.payload.attachments,
			});
			expect(claimed.thread.ownerId).toBe(owner.id);
			expect(claimed.admission.inputMessageIds).toEqual([first.messageId]);
			expect(
				await services.messageRepository.findOneByOrFail({ id: first.messageId }),
			).toMatchObject({
				createdAt: original.createdAt,
				content: buildInboundUserMessage('updated', data.payload.attachments)[0],
				modelContextAt: null,
			});
			await finish(services, claimed);
			await expect(services.queue.updatePending(target)).rejects.toThrow(
				'Queued message not found',
			);
		});

		it.each([
			['claim', 'remove'],
			['remove', 'remove'],
			['claim', 'edit'],
			['edit', 'edit'],
		] as const)(
			'serializes concurrent connections when %s wins the claim-versus-%s race',
			async (winner, operation) => {
				const local = recordingServices();
				const remote = recordingServices(undefined, peer);
				const threadId = uuid();
				const item = await enqueue(local, input(threadId, 'first', 'new'));
				const target = { projectId, agentId, threadId, userId: owner.id, queueId: item.id };
				const acquired = createDeferredPromise();
				const release = createDeferredPromise();
				const lock = local.threads.lockById.bind(local.threads);
				vi.spyOn(local.threads, 'lockById').mockImplementationOnce(async (...args) => {
					const thread = await lock(...args);
					acquired.resolve();
					await release.promise;
					return thread;
				});
				const observe = observePeerTransaction();
				const mutate = async (services: ReturnType<typeof recordingServices>) =>
					operation === 'edit'
						? await services.queue.updatePending({ ...target, message: 'edited' })
						: await services.queue.removePending(target);
				const first =
					winner === 'claim' ? local.queue.claimNext(threadId, async () => true) : mutate(local);
				await acquired.promise;
				const second =
					winner === 'claim' ? mutate(remote) : remote.queue.claimNext(threadId, async () => true);
				const results = Promise.allSettled([first, second]);
				try {
					await observe.started;
				} finally {
					release.resolve();
					observe.restore();
				}
				const settled = await results;
				expect(settled[0].status).toBe('fulfilled');
				if (winner === 'claim') {
					expect(settled[1]).toMatchObject({
						status: 'rejected',
						reason: { message: 'This message has already started' },
					});
					const claimed = await first;
					if (!claimed) throw new Error('Expected a claim');
					expect(await local.queueRepository.findOneByOrFail({ id: item.id })).toMatchObject({
						threadId,
						executionId: claimed.admission.executionId,
					});
					await finish(local, claimed);
				} else if (operation === 'edit') {
					const claimed = await second;
					if (!claimed) throw new Error('Expected a claim');
					expect(claimed.payload.message).toBe('edited');
					await finish(remote, claimed);
				} else {
					expect(settled[1]).toEqual({ status: 'fulfilled', value: null });
					expect(await repository.countBy({ threadId })).toBe(0);
				}
				expect(await local.queueRepository.countBy({ threadId })).toBe(0);
			},
		);

		it('serializes acceptance and claims across connections while other sessions progress', async () => {
			const local = recordingServices();
			const remote = recordingServices(undefined, peer);
			const threadId = uuid();
			const first = await enqueue(local, input(threadId, 'first', 'new'));
			const inserted = createDeferredPromise<OperationContext>();
			const release = createDeferredPromise();
			const insert = local.queueRepository.enqueue.bind(local.queueRepository);
			const spy = vi
				.spyOn(local.queueRepository, 'enqueue')
				.mockImplementationOnce(async (...args) => {
					const item = await insert(...args);
					inserted.resolve(args[3]);
					await release.promise;
					return item;
				});
			const competing = observePeerTransaction();
			try {
				const second = enqueue(local, input(threadId, 'second'));
				const ctx = await inserted.promise;
				const third = enqueue(remote, input(threadId, 'third'));
				await competing.started;
				await waitForPeerLock(ctx);
				release.resolve();
				const accepted = [first, ...(await Promise.all([second, third]))];
				expect(accepted.map(({ id }) => BigInt(id))).toEqual(
					accepted.map(({ id }) => BigInt(id)).sort((a, b) => (a < b ? -1 : 1)),
				);
			} finally {
				release.resolve();
				spy.mockRestore();
				competing.restore();
			}
			const claims = await Promise.all(
				[local, remote].map(async (services) => ({
					services,
					item: await services.queue.claimNext(threadId, async () => true),
				})),
			);
			const winner = claims.find(({ item }) => item !== null);
			if (!winner?.item) throw new Error('Expected one consumer');
			expect(claims.filter(({ item }) => item !== null)).toHaveLength(1);
			expect(winner.item.item.id).toBe(first.id);
			expect(await repository.countBy({ threadId, status: 'running' })).toBe(1);
			expect(await local.messageRepository.countBy({ threadId })).toBe(3);
			await expect(
				local.executionService.startExecutionRecording(winner.item.recording, new Date()),
			).rejects.toBeInstanceOf(AgentTurnAlreadyRunningError);
			const independentId = uuid();
			await enqueue(remote, input(independentId, 'independent', 'new'));
			const independent = await claim(remote, independentId);
			await finish(remote, independent);
			await finish(winner.services, winner.item);
			for (const message of ['second', 'third']) {
				const next = await claim(local, threadId);
				expect(next.payload.message).toBe(message);
				await finish(local, next);
			}
			expect(await local.queueRepository.count()).toBe(0);
			const later = await enqueue(local, input(threadId, 'later'));
			expect(BigInt(later.id)).toBeGreaterThan(BigInt(independent.item.id));
		});

		it.each([new Error('acceptance failed'), new AgentMessageIdConflictError('another-message')])(
			'rolls back failed acceptance and claim: %s',
			async (error) => {
				const services = recordingServices();
				const threadId = uuid();
				const data = input(threadId, 'first', 'new', uuid());
				const insert = services.queueRepository.enqueue.bind(services.queueRepository);
				const failedInsert = vi
					.spyOn(services.queueRepository, 'enqueue')
					.mockImplementationOnce(async (...args) => {
						await insert(...args);
						throw error;
					});
				await expect(services.queue.enqueue(data)).rejects.toBe(error);
				failedInsert.mockRestore();
				expect(await threadRepo.findOneBy({ id: threadId })).toBeNull();
				expect(await services.messageRepository.countBy({ threadId })).toBe(0);
				expect(await Container.get(AgentThreadRepository).findOneBy({ id: threadId })).toBeNull();
				expect(await services.queueRepository.count()).toBe(0);
				const accepted = await enqueue(services, data);
				const failedLink = vi
					.spyOn(services.queueRepository, 'linkExecution')
					.mockResolvedValueOnce(false);
				await expect(claim(services, threadId)).rejects.toBeInstanceOf(
					AgentTurnAlreadyRunningError,
				);
				failedLink.mockRestore();
				expect(await services.messageRepository.countBy({ threadId })).toBe(1);
				expect(
					await Container.get(AgentThreadRepository).findOneBy({ id: threadId }),
				).not.toBeNull();
				expect(await repository.manager.count(AgentExecutionMessageLink)).toBe(0);
				expect(await repository.countBy({ threadId })).toBe(0);
				expect(await services.queueRepository.findDeliveryState(accepted.id)).toMatchObject({
					executionId: null,
					messageId: accepted.messageId,
				});
				await finish(services, await claim(services, threadId));
			},
		);

		it('settles accepted Preview input after its session owner is deleted', async () => {
			const services = recordingServices();
			const threadId = uuid();
			const queued = await enqueue(services, input(threadId, 'pending', 'new'));
			await Container.get(UserRepository).delete(owner.id);

			const active = await claim(services, threadId);
			expect(active.thread.ownerId).toBeNull();
			await services.queue.recordFailure(active, new Error('Owner deleted'));
			await services.queue.settle(threadId, active.admission.executionId);

			expect(await services.queueRepository.countBy({ threadId })).toBe(0);
			expect(await repository.findOneByOrFail({ id: active.admission.executionId })).toMatchObject({
				status: 'error',
				error: 'Owner deleted',
			});
			expect(
				await services.messageRepository.findOneByOrFail({ id: queued.messageId }),
			).toMatchObject({
				content: buildInboundUserMessage('pending', [])[0],
				modelContextAt: null,
			});
		});

		it('enforces active-slot uniqueness and prevents execution deletion from requeuing a message', async () => {
			const services = recordingServices();
			const threadId = uuid();
			await enqueue(services, input(threadId, 'first', 'new'));
			const pending = await enqueue(services, input(threadId, 'second'));
			const active = await claim(services, threadId);
			await expect(
				services.queueRepository.update(pending.id, { executionId: active.admission.executionId }),
			).rejects.toThrow();
			await expect(repository.delete(active.admission.executionId)).rejects.toThrow();
			expect(await services.queueRepository.findDeliveryState(active.item.id)).toMatchObject({
				executionId: active.admission.executionId,
			});
			await finish(services, active);
		});

		it('recovers pending and abandoned work without replaying the interrupted input', async () => {
			const local = recordingServices();
			const remote = recordingServices(undefined, peer);
			const threadId = uuid();
			await enqueue(local, input(threadId, 'interrupted', 'new'));
			await enqueue(local, input(threadId, 'next'));
			const active = await claim(remote, threadId);
			const cutoff = new Date(Date.now() - 120_000);
			await repository.update(active.admission.executionId, {
				updatedAt: new Date(cutoff.getTime() - 1),
			});
			const stale = await repository.findOneByOrFail({ id: active.admission.executionId });
			await repository.touchRunning(stale.id);
			expect(await local.executionService.finalizeInterruptedExecution(stale, cutoff)).toBe(false);
			await repository.update(stale.id, { updatedAt: new Date(cutoff.getTime() - 1) });
			expect(await local.executionService.finalizeInterruptedExecution(stale, cutoff)).toBe(true);
			const next = await claim(local, threadId);
			expect(next.payload.message).toBe('next');
			await expect(finish(remote, active)).rejects.toThrow('no longer running');
			await finish(local, next);
			expect(
				(
					await local.executionService.getThreadDetail(threadId, projectId, agentId, owner.id)
				)?.executions.map(({ userMessage, status }) => ({
					userMessage,
					status,
				})),
			).toEqual([
				{ userMessage: 'interrupted', status: 'interrupted' },
				{ userMessage: 'next', status: 'success' },
			]);
		});

		it.each(['settled', 'running', 'interrupted'] as const)(
			'keeps approval ownership when its predecessor is %s and ignores late callbacks',
			async (predecessor) => {
				const local = recordingServices();
				const remote = recordingServices(undefined, peer);
				const threadId = uuid();
				const original = input(threadId, 'approval', 'new', uuid());
				await enqueue(local, original);
				const pending = await enqueue(local, input(threadId, 'later'));
				const active = await claim(local, threadId);
				await local.queue.steer({
					projectId,
					agentId,
					threadId,
					userId: owner.id,
					queueId: pending.id,
					executionId: active.admission.executionId,
				});
				const runId = uuid();
				const state: SerializableAgentState = {
					status: 'suspended',
					messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
					pendingToolCalls: {},
					persistence: {
						threadId,
						resourceId: `draft-chat:${owner.id}`,
						hostMetadata: { [EXECUTION_METADATA_KEY]: active.admission.executionId },
					},
				};
				await local.checkpointStorage.save(runId, state, agentId);
				expect(await remote.queue.enqueue(original)).toEqual({ status: 'duplicate' });
				expect(await repository.findExecution(active.admission.executionId)).toMatchObject({
					acceptsSteering: false,
				});
				expect(await remote.queueRepository.findOneByOrFail({ id: pending.id })).toMatchObject({
					steeringExecutionId: null,
					steeringOrder: null,
				});
				if (predecessor === 'settled') await finish(local, active);
				if (predecessor === 'interrupted') {
					const cutoff = new Date(Date.now() - 120_000);
					await repository.update(active.admission.executionId, {
						updatedAt: new Date(cutoff.getTime() - 1),
					});
					const stale = await repository.findOneByOrFail({ id: active.admission.executionId });
					expect(await remote.executionService.finalizeInterruptedExecution(stale, cutoff)).toBe(
						true,
					);
				}
				expect(await remote.queue.claimNext(threadId, async () => true)).toBeNull();
				expect(await remote.queueRepository.findDeliveryState(active.item.id)).not.toBeNull();
				const admission = await remote.executionService.startExecutionRecording(
					{ ...active.recording, userMessage: null, resumeRunId: runId },
					new Date(),
				);
				const resumedId = admission.executionId;
				expect(admission.inputMessageIds).toEqual(active.admission.inputMessageIds);
				expect(await remote.queue.enqueue(original)).toEqual({ status: 'duplicate' });
				await local.queue.settle(threadId, active.admission.executionId);
				expect(await local.queueRepository.findDeliveryState(active.item.id)).toMatchObject({
					executionId: resumedId,
				});
				await expect(local.checkpointStorage.save(runId, state, agentId)).rejects.toThrow(
					'no longer owns',
				);
				await expect(
					local.checkpointStorage.getStorage(agentId).delete(runId, state),
				).rejects.toThrow('no longer owns');
				expect(await local.checkpointStorage.cancelSuspended(runId, state, agentId)).toBe(false);
				if (predecessor === 'running') await finish(local, active);
				const resumedState = {
					...state,
					persistence: {
						...state.persistence!,
						hostMetadata: { [EXECUTION_METADATA_KEY]: resumedId },
					},
				};
				await remote.checkpointStorage.getStorage(agentId).delete(runId, resumedState);
				await finish(remote, {
					...active,
					admission,
				});
				const next = await claim(local, threadId);
				expect(next.item.id).toBe(pending.id);
				await local.queue.settle(threadId, active.admission.executionId);
				expect(await local.queueRepository.findDeliveryState(next.item.id)).toMatchObject({
					executionId: next.admission.executionId,
				});
				await finish(local, next);
				expect(await remote.queue.enqueue(original)).toEqual({ status: 'duplicate' });
			},
		);

		it('advances after approval expiry without waiting for pruning', async () => {
			const services = recordingServices();
			const threadId = uuid();
			await enqueue(services, input(threadId, 'approval', 'new'));
			const pending = await enqueue(services, input(threadId, 'later'));
			const active = await claim(services, threadId);
			const runId = uuid();
			await services.checkpointStorage.save(
				runId,
				{
					status: 'suspended',
					persistence: { threadId, resourceId: owner.id },
					messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
					pendingToolCalls: {},
				},
				agentId,
			);
			await finish(services, active);
			expect(await services.queue.claimNext(threadId, async () => true)).toBeNull();
			await Container.get(AgentCheckpointRepository).update(runId, {
				updatedAt: new Date(Date.now() - (new AgentsConfig().checkpointTtlSeconds + 1) * 1000),
			});
			const next = await claim(services, threadId);
			expect(next.item.id).toBe(pending.id);
			await expect(services.checkpointStorage.load(runId, agentId)).rejects.toThrow('expired');
			expect(await Container.get(AgentCheckpointRepository).findByRunId(runId)).toMatchObject({
				expired: false,
			});
			await finish(services, next);
		});

		it('removes pending input, attachments, and acceptance identity on session deletion', async () => {
			const services = recordingServices(Container.get(N8nMemory).getImplementation(agentId));
			const threadId = uuid();
			const attachment = await attachmentRepo.save(buildAttachment(threadId));
			const accepted = input(threadId, 'pending', 'new', uuid());
			accepted.payload.attachments = [
				{
					id: attachment.id,
					fileName: attachment.fileName,
					mimeType: attachment.mimeType,
					sizeBytes: attachment.fileSizeBytes,
				},
			];
			await enqueue(services, accepted);
			expect(
				await services.executionService.deleteThread(projectId, agentId, threadId, owner.id),
			).toBe(true);
			expect(await services.queueRepository.countBy({ threadId })).toBe(0);
			expect(await attachmentRepo.findOneBy({ id: attachment.id })).toBeNull();
			expect(await services.messageRepository.countBy({ threadId })).toBe(0);
			expect(services.attachmentService.deleteStoredData).toHaveBeenCalledWith(
				[attachment.binaryDataId],
				{ threadId },
			);
			expect(await services.queue.claimNext(threadId, async () => true)).toBeNull();
			await expect(enqueue(services, input(threadId, 'late'))).rejects.toThrow();
			expect(await threadRepo.findOneBy({ id: threadId })).toBeNull();
			await enqueue(services, { ...accepted, payload: { ...accepted.payload, attachments: [] } });
			expect(await services.messageRepository.countBy({ threadId })).toBe(1);
		});

		it('cascades agent deletion through pending queue rows', async () => {
			const services = recordingServices();
			const threadId = uuid();
			await enqueue(services, input(threadId, 'pending', 'new'));
			await agentRepo.delete(agentId);
			expect(await services.queueRepository.countBy({ threadId })).toBe(0);
		});
	});

	it('loads inputs across a large execution ID lookup', async () => {
		const thread = await createThread();
		const { messageRepository } = recordingServices();
		const executionIds: string[] = [];
		const expected = new Map<string, string>();
		for (let position = 0; position < 2; position++) {
			const execution = await createExecution({ threadId: thread.id });
			const message = await messageRepository.createInput(
				{
					threadId: thread.id,
					resourceId: 'user-1',
					content: { role: 'user', content: [{ type: 'text', text: 'Input' }] },
					origin: { source: 'chat' },
				},
				{},
			);
			executionIds.push(execution.id);
			await messageRepository.linkExecutionInput(
				execution.id,
				message.id,
				{ threadId: thread.id, resourceId: 'user-1' },
				{},
			);
			expected.set(execution.id, message.id);
		}
		executionIds.splice(1, 0, ...Array.from({ length: 33_000 }, () => uuid()));

		const inputs = await messageRepository.findExecutionInputs(executionIds);

		expect(inputs.size).toBe(2);
		for (const [executionId, messageId] of expected) {
			expect(inputs.get(executionId)?.map(({ id }) => id)).toEqual([messageId]);
		}
	});

	it.each([
		['direct', 'message-42'],
		['queued', 'message-42'],
		['queued', undefined],
	] as const)('preserves %s canonical input (%s)', async (path, platformMessageId) => {
		const thread = await createThread();
		const threadId = thread.id;
		const resourceId = 'user-1';
		const memory = Container.get(N8nMemory).getImplementation(agentId);
		const services = recordingServices(memory);
		const legacy = await createExecution({
			threadId,
			userMessage: 'Legacy question',
			createdAt: new Date('2026-01-01'),
			timeline: [{ type: 'text', content: 'Legacy answer', timestamp: 1 }],
		});
		await memory.saveThread({ id: threadId, resourceId });
		await memory.saveMessages({
			threadId,
			resourceId,
			messages: [
				{
					id: uuid(),
					createdAt: new Date('2026-01-01'),
					role: 'user',
					content: [{ type: 'text', text: 'Legacy question' }],
				},
			],
		});
		const attachment = await attachmentRepo.save(buildAttachment(threadId));
		const attachments = [
			{
				id: attachment.id,
				fileName: attachment.fileName,
				mimeType: attachment.mimeType,
				sizeBytes: attachment.fileSizeBytes,
			},
		];
		const params = {
			access: { accessScope: 'project' as const, ownerId: null },
			agentId,
			agentName: 'Test Agent',
			projectId,
			threadId,
			resourceId,
			userMessage: 'Original input',
			author: { id: 'author-1', name: 'Ada' },
			attachments,
			source: 'slack',
			messageOrigin: {
				integrationConnectionId: 'slack:credential',
				...(platformMessageId !== undefined ? { platformMessageId } : {}),
			},
		};
		let admission: AgentExecutionAdmission;
		if (path === 'direct') {
			admission = await services.executionService.startExecutionRecording(params, new Date());
		} else {
			const payload: QueuedIntegrationMessage = {
				kind: 'integration',
				message: params.userMessage,
				resourceId,
				attachments,
				modelMessage: '[Ada]: Original input',
				author: params.author,
				credentialId: 'credential',
				platformThreadId: 'slack:channel:thread',
				sender: {
					userId: 'author-1',
					userName: 'ada',
					fullName: 'Ada',
					isBot: false,
					isMe: false,
				},
				messageContext: {
					integrationConnectionId: 'slack:credential',
					...(platformMessageId !== undefined ? { messageId: platformMessageId } : {}),
					platform: 'slack',
					target: { type: 'thread', threadId: 'slack:channel:thread' },
					replyTarget: { type: 'thread', threadId: 'slack:channel:reply' },
					replyMessageId: 'reply-41',
					updatedAt: '2026-06-01T12:00:00.000Z',
				},
				contextConversation: { threadId: 'integration-context', resourceId: 'integration-user' },
				forceBuffered: true,
			};
			const queued = await enqueue(services, {
				agentId,
				projectId,
				threadId,
				sessionMode: 'existing',
				source: 'slack',
				payload,
			});
			for (const field of [
				'message',
				'resourceId',
				'attachments',
				'author',
				'modelMessage',
				'platformThreadId',
				'messageContext.platform',
				'messageContext.integrationConnectionId',
				'messageContext.messageId',
			]) {
				expect(queued.payload).not.toHaveProperty(field);
			}
			expect((await memory.getMessages(threadId)).map(({ id }) => id)).not.toContain(
				queued.messageId,
			);
			const origin = {
				source: 'slack',
				...params.messageOrigin,
				platformThreadId: payload.platformThreadId,
			};
			for (const invalidOrigin of [
				null,
				{ ...origin, source: null },
				{ ...origin, integrationConnectionId: undefined },
				{ ...origin, platformThreadId: undefined },
			]) {
				await services.messageRepository.update(queued.messageId, { origin: invalidOrigin });
				await expect(services.queue.claimNext(threadId, async () => true)).rejects.toThrow(
					'Queued integration input has incomplete origin',
				);
			}
			await services.messageRepository.update(queued.messageId, { origin });
			const claimed = await services.queue.claimNext(threadId, async () => true);
			expect(claimed?.payload).toStrictEqual(payload);
			expect(claimed?.recording.source).toBe('slack');
			admission = claimed!.admission;
			expect(admission.inputMessageIds).toEqual([queued.messageId]);
		}
		const [id] = admission.inputMessageIds;
		const canonical = await services.messageRepository.findOneByOrFail({ id });
		expect(canonical).toMatchObject({
			content: buildInboundUserMessage(params.userMessage, attachments)[0],
			author: params.author,
			modelContextAt: null,
			modelContent:
				path === 'queued' ? buildInboundUserMessage('[Ada]: Original input', attachments)[0] : null,
			origin: { source: 'slack', ...params.messageOrigin },
		});
		expect(
			(await memory.getMessages(threadId)).map(({ id: messageId }) => messageId),
		).not.toContain(id);
		expect(await repository.findOneByOrFail({ id: admission.executionId })).toMatchObject({
			userMessage: null,
			author: null,
			attachments: null,
		});
		const { makeAgent, model } = createApprovalAgentFactory(threadId, undefined, 0);
		const agent = makeAgent(services.checkpointStorage.getStorage(agentId));
		try {
			await collect(
				services.turns.execute({
					agentInstance: agent,
					toolRegistry: new Map(),
					mcpServerAttributions: new Map(),
					context: params,
					admittedExecution: admission,
					prepare: async () => ({
						type: 'start',
						input: buildInboundUserMessage('[Ada]: Original input', attachments),
						options: { persistence: { threadId, resourceId } },
						recording: params,
					}),
				}),
			);
		} finally {
			await agent.close();
		}
		const stored = await services.messageRepository.findOneByOrFail({ id });
		expect(stored).toMatchObject({
			content: canonical.content,
			author: canonical.author,
			origin: canonical.origin,
			createdAt: canonical.createdAt,
		});
		expect(stored.modelContent).not.toEqual(canonical.content);
		expect(stored.modelContextAt).toBeInstanceOf(Date);
		const prompt = JSON.stringify(model.doStreamCalls[0].prompt);
		expect(prompt.match(/Original input/g)).toHaveLength(1);
		expect(prompt).toContain('Legacy question');
		const runtimeMessages = await memory.getMessages(threadId);
		expect(runtimeMessages.filter((message) => message.id === id)).toHaveLength(1);
		const input = runtimeMessages.find((message) => message.id === id)!;
		const observed = await memory.getMessagesForObservationScope(threadId, {
			since: { sinceCreatedAt: input.createdAt, sinceMessageId: input.id },
		});
		expect(observed).toHaveLength(1);
		expect(observed[0]).toMatchObject({
			role: 'assistant',
			content: [{ type: 'text', text: 'Done' }],
		});
		expect(await memory.getMessages(threadId, { before: input.createdAt, limit: 1 })).toHaveLength(
			1,
		);
		const detail = await services.executionService.getThreadDetail(
			threadId,
			projectId,
			agentId,
			viewerId,
		);
		expect(detail?.executions[1]).toMatchObject({
			userMessage: 'Original input',
			author: params.author,
			attachments,
			inputMessageIds: [id],
		});
		const history = executionsToMessagesDto(detail!.executions);
		expect(history.map(({ id: messageId }) => messageId)).toEqual([
			`${legacy.id}:user`,
			`${legacy.id}:assistant`,
			id,
			`${admission.executionId}:assistant`,
		]);
		expect(history[3].content).toContainEqual({ type: 'text', text: 'Done' });
		expect(formatPreviewSessionContext(detail!.thread, detail!.executions)).toContain(
			'User: Original input',
		);
		expect(
			await services.executionService.getThreadDetail(
				threadId,
				'another-project',
				agentId,
				viewerId,
			),
		).toBeNull();

		await memory.saveThread({ id: 'builder-without-session', resourceId });
		await memory.saveMessages({
			threadId: 'builder-without-session',
			resourceId,
			messages: [
				{
					id: uuid(),
					createdAt: new Date(),
					role: 'assistant',
					content: [{ type: 'text', text: 'Builder output' }],
				},
			],
		});
		expect(
			await services.executionService.deleteThread(projectId, agentId, threadId, viewerId),
		).toBe(true);
		expect(await services.messageRepository.countBy({ threadId })).toBe(0);
		expect(await repository.manager.count(AgentExecutionMessageLink)).toBe(0);
		expect(services.attachmentService.deleteStoredData).toHaveBeenCalledWith(
			[attachment.binaryDataId],
			{ threadId },
		);
		expect(await memory.getMessages('builder-without-session')).toHaveLength(1);
	});

	it('keeps input and output positions on repeated saves and hides internal input', async () => {
		const threadId = uuid();
		const resourceId = 'user-1';
		const memory = Container.get(N8nMemory).getImplementation(agentId);
		const { executionService, messageRepository } = recordingServices(memory);
		const params = {
			access: { accessScope: 'project' as const, ownerId: null },
			agentId,
			agentName: 'Test Agent',
			projectId,
			threadId,
			resourceId,
			userMessage: 'Internal result',
			hideUserMessageFromTranscript: true,
		};
		const admission = await executionService.startExecutionRecording(params, new Date());
		const [inputId] = admission.inputMessageIds;
		const additional = await messageRepository.createInput(
			{
				threadId,
				resourceId,
				content: { role: 'user', content: [{ type: 'text', text: 'Additional internal result' }] },
				origin: { source: null, hidden: true },
			},
			{},
		);
		for (const id of [additional.id, inputId, additional.id]) {
			await messageRepository.linkExecutionInput(
				admission.executionId,
				id,
				{ threadId, resourceId },
				{},
			);
		}
		const input = {
			...buildInboundUserMessage(params.userMessage, [])[0],
			id: inputId,
			createdAt: new Date(),
		};
		// Output messages can have the user role. Reserved IDs identify the input.
		const output = { ...input, id: uuid(), content: [{ type: 'text' as const, text: 'Output' }] };
		// ID order must not change output order.
		const later = {
			...output,
			id: '00000000-0000-4000-8000-000000000002',
			content: [{ type: 'text' as const, text: 'Later' }],
		};
		const latest = {
			...output,
			id: '00000000-0000-4000-8000-000000000001',
			content: [{ type: 'text' as const, text: 'Latest' }],
		};
		const scope = {
			threadId,
			resourceId,
			hostMetadata: { [EXECUTION_METADATA_KEY]: admission.executionId },
		};
		await memory.saveMessages({ ...scope, messages: [input, output] });
		await memory.saveMessages({
			...scope,
			messages: [
				later,
				latest,
				output,
				input,
				{ ...additional.content, id: additional.id, createdAt: additional.createdAt },
			],
		});
		expect((await messageRepository.findOneByOrFail({ id: inputId })).modelContent).toBeNull();
		const links = await repository.manager.find(AgentExecutionMessageLink, {
			where: { executionId: admission.executionId },
			order: { direction: 'ASC', position: 'ASC' },
		});
		expect(
			links.map(({ messageId, direction, position }) => ({ messageId, direction, position })),
		).toEqual([
			{ messageId: inputId, direction: 'input', position: 0 },
			{ messageId: additional.id, direction: 'input', position: 1 },
			{ messageId: output.id, direction: 'output', position: 0 },
			{ messageId: later.id, direction: 'output', position: 1 },
			{ messageId: latest.id, direction: 'output', position: 2 },
		]);
		const detail = await executionService.getThreadDetail(threadId, projectId, agentId, viewerId);
		expect(detail?.executions[0]).toMatchObject({
			inputMessageIds: [inputId, additional.id],
			inputMessages: [],
			userMessage: null,
		});
		expect(await repository.findFirstUserMessageByThreadIds([threadId])).toEqual(new Map());
		const recorder = new ExecutionRecorder();
		recorder.record({ type: 'finish', finishReason: 'stop' });
		await executionService.finalizeExecution(admission.executionId, {
			...params,
			record: recorder.getMessageRecord(),
		});
		await expect(
			memory.saveMessages({ ...scope, messages: [{ ...output, content: [] }] }),
		).rejects.toThrow('no longer owns');
		expect((await messageRepository.findOneByOrFail({ id: output.id })).content).toMatchObject({
			content: output.content,
		});
		const next = await executionService.startExecutionRecording(
			{ ...params, userMessage: 'Visible input', hideUserMessageFromTranscript: false },
			new Date(),
		);
		expect(await repository.findFirstUserMessageByThreadIds([threadId])).toEqual(
			new Map([[threadId, 'Visible input']]),
		);
		await executionService.finalizeExecution(next.executionId, {
			...params,
			record: recorder.getMessageRecord(),
		});
	});

	it.each(['startup', 'failure', 'rejection', 'cancellation'] as const)(
		'retains original input and attachments after %s',
		async (outcome) => {
			const threadId = uuid();
			const resourceId = 'user-1';
			const memory = Container.get(N8nMemory).getImplementation(agentId);
			const services = recordingServices(memory);
			const attachments = [
				{ id: 'attachment-1', fileName: 'image.png', mimeType: 'image/png', sizeBytes: 3 },
			];
			const params = {
				access: { accessScope: 'project' as const, ownerId: null },
				agentId,
				agentName: 'Test Agent',
				projectId,
				threadId,
				resourceId,
				userMessage: 'Describe this image',
				attachments,
			};
			if (outcome === 'startup') {
				await services.turns.recordFailedStart(params, new Error('Startup failed'));
			} else {
				const controller = new AbortController();
				const error =
					outcome === 'rejection'
						? Object.assign(new Error('Image dimensions exceed max allowed size: 8000 pixels'), {
								statusCode: 400,
							})
						: new Error('Model unavailable');
				const model = new MockLanguageModelV3({
					doStream: async () => {
						if (outcome === 'cancellation') controller.abort();
						return { stream: convertArrayToReadableStream([{ type: 'error' as const, error }]) };
					},
				});
				const agent = new RuntimeAgent('Test Agent')
					.instructions('Describe the image.')
					.model(model)
					.memory(memory)
					.fileStore({ load: async () => new Uint8Array([1, 2, 3]) });
				try {
					await collect(
						services.turns.execute({
							agentInstance: agent,
							toolRegistry: new Map(),
							mcpServerAttributions: new Map(),
							context: params,
							prepare: async () => ({
								type: 'start',
								input: buildInboundUserMessage('Enriched input', attachments),
								options: { abortSignal: controller.signal, persistence: { threadId, resourceId } },
								recording: params,
							}),
						}),
					);
				} finally {
					await agent.close();
				}
			}
			const [execution] = await repository.findByThreadIdOrdered(threadId);
			const inputs = await services.messageRepository.findExecutionInputs([execution.id]);
			expect(inputs.get(execution.id)).toHaveLength(1);
			const [input] = inputs.get(execution.id)!;
			expect(input.content).toEqual(buildInboundUserMessage(params.userMessage, attachments)[0]);
			expect(
				(await services.executionService.getThreadDetail(threadId, projectId, agentId, viewerId))
					?.executions[0],
			).toMatchObject({ userMessage: params.userMessage, attachments });
			if (outcome === 'startup' || outcome === 'rejection') {
				expect(input.modelContextAt).toBeNull();
				expect(await memory.getMessages(threadId)).toEqual([]);
			} else {
				expect(input.modelContextAt).toBeInstanceOf(Date);
			}
		},
	);

	const createThread = async (overrides: Partial<AgentExecutionThread> = {}) => {
		const thread = threadRepo.create({
			accessScope: 'project',
			id: uuid(),
			agentId,
			agentName: 'Test Agent',
			projectId,
			sessionNumber: 1,
			...overrides,
		});
		return await threadRepo.save(thread);
	};

	const createExecution = async (overrides: Partial<AgentExecution>) => {
		const execution = repository.create({
			id: uuid(),
			status: 'success',
			userMessage: null,
			...overrides,
		} as Partial<AgentExecution>);
		return await repository.save(execution);
	};

	it('paginates sessions with whole-second and millisecond timestamps', async () => {
		const newest = await createThread();
		const middle = await createThread();
		const oldest = await createThread();
		for (const [id, timestamp] of [
			[newest.id, '2026-01-03 00:00:01'],
			[middle.id, '2026-01-03 00:00:00.500'],
			[oldest.id, '2026-01-03 00:00:00'],
		]) {
			await threadRepo
				.createQueryBuilder()
				.update()
				.set({ updatedAt: () => `'${timestamp}'` })
				.where('id = :id', { id })
				.execute();
		}

		const first = await threadRepo.findByProjectIdPaginated(projectId, agentId, viewerId, 1);
		const second = await threadRepo.findByProjectIdPaginated(
			projectId,
			agentId,
			viewerId,
			1,
			first.nextCursor ?? undefined,
		);
		const third = await threadRepo.findByProjectIdPaginated(
			projectId,
			agentId,
			viewerId,
			1,
			second.nextCursor ?? undefined,
		);
		const after = await threadRepo.findByProjectIdPaginated(
			projectId,
			agentId,
			viewerId,
			10,
			undefined,
			{
				updatedAfter: new Date('2026-01-03T00:00:00Z'),
			},
		);

		expect(first.threads.map(({ id }) => id)).toEqual([newest.id]);
		expect(second.threads.map(({ id }) => id)).toEqual([middle.id]);
		expect(third.threads.map(({ id }) => id)).toEqual([oldest.id]);
		expect(third.nextCursor).toBeNull();
		expect(after.threads.map(({ id }) => id)).toEqual([newest.id, middle.id, oldest.id]);
	});

	it('filters private sessions before pagination and preserves their owner on reuse', async () => {
		const owner = await createMember();
		const other = await createAdmin();
		const otherProject = await createTeamProject();
		const otherAgent = await agentRepo.save(
			agentRepo.create({
				id: uuid(),
				name: 'Other agent',
				projectId,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);
		const { executionService, txRunner } = recordingServices();
		const access = { accessScope: 'user' as const, ownerId: owner.id };
		const { thread } = await txRunner.run(
			{},
			async (ctx) =>
				await threadRepo.findOrCreate(uuid(), agentId, 'Test Agent', projectId, access, ctx),
		);
		await threadRepo.update(thread.id, { updatedAt: new Date('2026-01-03T00:00:00Z') });
		const shared = await createThread({
			sessionNumber: 2,
			updatedAt: new Date('2026-01-01T00:00:00Z'),
		});
		await createThread({
			accessScope: 'user',
			ownerId: other.id,
			sessionNumber: 3,
			updatedAt: new Date('2026-01-02T00:00:00Z'),
		});
		await createThread({
			accessScope: 'user',
			ownerId: null,
			sessionNumber: 4,
			updatedAt: new Date('2026-01-04T00:00:00Z'),
		});
		await createExecution({ threadId: thread.id, userMessage: 'Private message' });

		const first = await executionService.getThreads(projectId, agentId, owner.id, 1);
		const second = await executionService.getThreads(
			projectId,
			agentId,
			owner.id,
			1,
			first.nextCursor ?? undefined,
		);
		expect(first.threads.map(({ id }) => id)).toEqual([thread.id]);
		expect(first.threads[0]).not.toHaveProperty('ownerId');
		expect(first.threads[0]).not.toHaveProperty('accessScope');
		expect(first.threads[0].canContinueInPreview).toBe(true);
		expect(second.threads.map(({ id }) => id)).toEqual([shared.id]);
		expect(second.threads[0].canContinueInPreview).toBe(false);
		expect(second.nextCursor).toBeNull();
		expect(
			(await executionService.getThreadDetail(thread.id, projectId, agentId, owner.id))?.executions,
		).toHaveLength(1);
		await expect(
			executionService.getThreadDetail(thread.id, projectId, agentId, other.id),
		).resolves.toBeNull();
		expect(await executionService.deleteThread(projectId, agentId, thread.id, other.id)).toBe(
			false,
		);
		for (const incompatible of [
			{ agentId, projectId, access: { accessScope: 'user' as const, ownerId: other.id } },
			{ agentId, projectId, access: { accessScope: 'project' as const, ownerId: null } },
			{ agentId: otherAgent.id, projectId, access },
			{ agentId, projectId: otherProject.id, access },
		]) {
			await expect(
				txRunner.run(
					{},
					async (ctx) =>
						await threadRepo.findOrCreate(
							thread.id,
							incompatible.agentId,
							'Test Agent',
							incompatible.projectId,
							incompatible.access,
							ctx,
						),
				),
			).rejects.toThrow('Session not found');
		}
		expect(
			await txRunner.run(
				{},
				async (ctx) =>
					await threadRepo.findOrCreate(thread.id, agentId, 'Test Agent', projectId, access, ctx),
			),
		).toMatchObject({ created: false, thread: access });
		const child = await txRunner.run(
			{},
			async (ctx) =>
				await threadRepo.findOrCreate(
					uuid(),
					agentId,
					'Test Agent',
					projectId,
					{ accessScope: 'user', ownerId: null },
					ctx,
					{ parentThreadId: thread.id, parentAgentId: agentId },
				),
		);
		expect(child.thread).toMatchObject(access);
		expect(
			await executionService.canUseDraftThread(child.thread.id, projectId, agentId, owner.id),
		).toBe(false);
		const sharedChild = await txRunner.run(
			{},
			async (ctx) =>
				await threadRepo.findOrCreate(
					uuid(),
					agentId,
					'Test Agent',
					projectId,
					{ accessScope: 'user', ownerId: null },
					ctx,
					{ parentThreadId: shared.id, parentAgentId: agentId },
				),
		);
		expect(sharedChild.thread).toMatchObject({ accessScope: 'project', ownerId: null });
	});

	it('finds the latest Preview root behind other private sessions', async () => {
		const owner = await createMember();
		const { executionService } = recordingServices();
		const privateThread = await createThread({
			accessScope: 'user',
			ownerId: owner.id,
			updatedAt: new Date('2026-01-01T00:00:00Z'),
		});
		for (let index = 0; index < 20; index++) {
			await createThread({ sessionNumber: index + 2, updatedAt: new Date('2026-01-02T00:00:00Z') });
		}
		const child = await createThread({
			accessScope: 'user',
			ownerId: owner.id,
			sessionNumber: 22,
			parentThreadId: privateThread.id,
			parentAgentId: agentId,
		});
		const sourceOnlySubAgent = await createThread({
			accessScope: 'user',
			ownerId: owner.id,
			sessionNumber: 23,
		});
		await createExecution({ threadId: sourceOnlySubAgent.id, source: ' Sub-Agent ' });
		const mcpThread = await createThread({
			accessScope: 'user',
			ownerId: owner.id,
			sessionNumber: 24,
		});
		await createExecution({ threadId: mcpThread.id, source: 'mcp' });
		const instanceAiThread = await createThread({
			accessScope: 'user',
			ownerId: owner.id,
			sessionNumber: 25,
		});
		await createExecution({ threadId: instanceAiThread.id, source: 'instance-ai' });
		const taskThread = await createThread({
			accessScope: 'user',
			ownerId: owner.id,
			sessionNumber: 26,
			taskId: 'task-1',
		});
		const ordinaryThread = await createThread({
			id: `test-${agentId}`,
			accessScope: 'user',
			ownerId: owner.id,
			sessionNumber: 27,
			updatedAt: new Date('2025-12-01T00:00:00Z'),
		});

		const history = await executionService.getThreads(projectId, agentId, owner.id, 20);
		expect(history.threads.map(({ id }) => id)).not.toContain(privateThread.id);
		const preview = await executionService.getThreads(projectId, agentId, owner.id, 20, undefined, {
			previewOnly: true,
		});
		expect(preview.threads).toEqual([
			expect.objectContaining({ id: privateThread.id, canContinueInPreview: true }),
			expect.objectContaining({ id: ordinaryThread.id, canContinueInPreview: true }),
		]);
		expect(preview.nextCursor).toBeNull();
		expect(await executionService.canUseDraftThread(child.id, projectId, agentId, owner.id)).toBe(
			false,
		);
		for (const thread of [child, sourceOnlySubAgent]) {
			expect(
				await executionService.getThreadDetail(thread.id, projectId, agentId, owner.id),
			).not.toBeNull();
		}
		for (const thread of [sourceOnlySubAgent, mcpThread, instanceAiThread, taskThread]) {
			expect(
				await executionService.canUseDraftThread(thread.id, projectId, agentId, owner.id),
			).toBe(true);
			expect(
				await executionService.canUseDraftThread(thread.id, projectId, agentId, owner.id, {
					previewChat: true,
				}),
			).toBe(false);
		}
		for (const thread of [privateThread, ordinaryThread]) {
			expect(
				await executionService.canUseDraftThread(thread.id, projectId, agentId, owner.id, {
					previewChat: true,
				}),
			).toBe(true);
		}
	});

	it.each(['custom', 'legacy'])('uses persisted ownership for a %s preview ID', async (format) => {
		const owner = await createMember();
		const other = await createAdmin();
		const memory = Container.get(N8nMemory).getImplementation(agentId);
		const { executionService } = recordingServices(memory);
		const threadId = format === 'legacy' ? `test-${agentId}:${other.id}` : 'test-demo';
		expect(await executionService.canUseDraftThread(threadId, projectId, agentId, owner.id)).toBe(
			true,
		);
		await memory.saveThread({ id: threadId, resourceId: `draft-chat:${owner.id}` });
		expect(await executionService.canUseDraftThread(threadId, projectId, agentId, owner.id)).toBe(
			true,
		);
		expect(await executionService.canUseDraftThread(threadId, projectId, agentId, other.id)).toBe(
			false,
		);
		await createThread({ id: threadId, accessScope: 'user', ownerId: owner.id });
		expect(await executionService.canUseDraftThread(threadId, projectId, agentId, owner.id)).toBe(
			true,
		);
		expect(await executionService.canUseDraftThread(threadId, projectId, agentId, other.id)).toBe(
			false,
		);
		await threadRepo.update(threadId, { ownerId: null });
		expect(await executionService.canUseDraftThread(threadId, projectId, agentId, owner.id)).toBe(
			false,
		);
		expect(await memory.getThread(threadId)).toMatchObject({
			resourceId: `draft-chat:${owner.id}`,
		});
		expect(await repository.findByThreadIdOrdered(threadId)).toEqual([]);
	});

	describe('findFirstUserMessageByThreadIds', () => {
		// The repository builds a raw SQL fragment referencing camelCase columns.
		// Postgres folds unquoted identifiers to lowercase, so this regression
		// fails on Postgres if the identifiers ever lose their double quotes.
		it('returns the earliest non-empty user message per thread', async () => {
			const threadA = await createThread({ sessionNumber: 1 });
			const threadB = await createThread({ id: uuid(), sessionNumber: 2 });

			await createExecution({
				threadId: threadA.id,
				userMessage: 'first A',
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: threadA.id,
				userMessage: 'second A',
				createdAt: new Date('2024-01-02T00:00:00Z'),
			});
			await createExecution({
				threadId: threadB.id,
				userMessage: 'only B',
				createdAt: new Date('2024-01-03T00:00:00Z'),
			});

			const result = await repository.findFirstUserMessageByThreadIds([threadA.id, threadB.id]);

			expect(result.get(threadA.id)).toBe('first A');
			expect(result.get(threadB.id)).toBe('only B');
			expect(result.size).toBe(2);
		});

		it('skips executions with null user messages when picking the earliest', async () => {
			const thread = await createThread();

			await createExecution({
				threadId: thread.id,
				userMessage: null,
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: thread.id,
				userMessage: 'real message',
				createdAt: new Date('2024-01-02T00:00:00Z'),
			});

			const result = await repository.findFirstUserMessageByThreadIds([thread.id]);

			expect(result.get(thread.id)).toBe('real message');
		});

		it('returns an empty map when no thread ids are provided', async () => {
			const result = await repository.findFirstUserMessageByThreadIds([]);

			expect(result.size).toBe(0);
		});

		it('omits threads that contain only null user messages', async () => {
			const thread = await createThread();

			await createExecution({
				threadId: thread.id,
				userMessage: null,
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});

			const result = await repository.findFirstUserMessageByThreadIds([thread.id]);

			expect(result.has(thread.id)).toBe(false);
		});
	});

	describe('findFirstSourceByThreadIds', () => {
		it('returns the earliest non-null source per thread', async () => {
			const threadA = await createThread({ sessionNumber: 1 });
			const threadB = await createThread({ id: uuid(), sessionNumber: 2 });

			await createExecution({
				threadId: threadA.id,
				source: 'slack',
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: threadA.id,
				source: 'telegram',
				createdAt: new Date('2024-01-02T00:00:00Z'),
			});
			await createExecution({
				threadId: threadB.id,
				source: 'telegram',
				createdAt: new Date('2024-01-03T00:00:00Z'),
			});

			const result = await repository.findFirstSourceByThreadIds([threadA.id, threadB.id]);

			expect(result.get(threadA.id)).toBe('slack');
			expect(result.get(threadB.id)).toBe('telegram');
			expect(result.size).toBe(2);
		});

		it('skips executions with null source when picking the earliest', async () => {
			const thread = await createThread();

			await createExecution({
				threadId: thread.id,
				source: null,
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: thread.id,
				source: 'slack',
				createdAt: new Date('2024-01-02T00:00:00Z'),
			});

			const result = await repository.findFirstSourceByThreadIds([thread.id]);

			expect(result.get(thread.id)).toBe('slack');
		});

		it('returns an empty map when no thread ids are provided', async () => {
			const result = await repository.findFirstSourceByThreadIds([]);

			expect(result.size).toBe(0);
		});

		it('omits threads that contain only null sources', async () => {
			const thread = await createThread();

			await createExecution({
				threadId: thread.id,
				source: null,
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});

			const result = await repository.findFirstSourceByThreadIds([thread.id]);

			expect(result.has(thread.id)).toBe(false);
		});
	});

	describe('failure summaries', () => {
		it('aggregates counts and the latest failure per thread', async () => {
			const thread = await createThread();
			await createExecution({
				threadId: thread.id,
				failureSummary: {
					count: 1,
					latest: { kind: 'tool', name: 'Lookup', message: 'failed', occurredAt: 10 },
				},
			});
			const latest = await createExecution({
				threadId: thread.id,
				failureSummary: {
					count: 2,
					latest: { kind: 'execution', name: null, message: 'stopped', occurredAt: 20 },
				},
			});

			const result = await repository.findFailureSummariesByThreadIds([thread.id]);

			expect(result.get(thread.id)).toEqual({
				count: 3,
				latest: {
					kind: 'execution',
					name: null,
					message: 'stopped',
					occurredAt: 20,
					executionId: latest.id,
				},
			});
		});
	});

	describe('session filters', () => {
		it('filters session status from the latest execution', async () => {
			const running = await createThread({ sessionNumber: 1 });
			const succeeded = await createThread({ sessionNumber: 2 });
			const recovered = await createThread({ sessionNumber: 3 });
			const errored = await createThread({ sessionNumber: 4 });
			const olderFailure = {
				count: 1,
				latest: { kind: 'tool' as const, name: 'Lookup', message: 'failed', occurredAt: 10 },
			};

			await createExecution({
				threadId: running.id,
				status: 'error',
				failureSummary: olderFailure,
				createdAt: new Date('2026-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: running.id,
				status: 'running',
				failureSummary: null,
				createdAt: new Date('2026-01-02T00:00:00Z'),
			});
			await createExecution({ threadId: succeeded.id, status: 'success', failureSummary: null });
			await createExecution({
				threadId: recovered.id,
				status: 'success',
				failureSummary: olderFailure,
			});
			await createExecution({ threadId: errored.id, status: 'error', failureSummary: null });

			const idsFor = async (status: AgentSessionStatus) =>
				(
					await threadRepo.findByProjectIdPaginated(
						projectId,
						agentId,
						'00000000-0000-4000-8000-000000000001',
						20,
						undefined,
						{
							status,
						},
					)
				).threads.map(({ id }) => id);

			expect(await idsFor('running')).toEqual([running.id]);
			expect(new Set(await idsFor('succeeded'))).toEqual(new Set([succeeded.id, recovered.id]));
			expect(await idsFor('error')).toEqual([errored.id]);

			const latestStatuses = await repository.findLatestStatusesByThreadIds([running.id]);
			expect(latestStatuses.get(running.id)).toBe('running');
		});

		it('mirrors the displayed origin precedence', async () => {
			const origins: Array<{
				sessionNumber: number;
				source: string | null;
				laterSource?: string;
				parentThreadId?: string;
				taskId?: string;
				expected: AgentSessionOrigin;
			}> = [
				{
					sessionNumber: 1,
					source: 'slack',
					parentThreadId: 'parent-1',
					taskId: 'task-1',
					expected: 'sub-agent',
				},
				{ sessionNumber: 2, source: 'subagent', expected: 'sub-agent' },
				{ sessionNumber: 3, source: 'slack', taskId: 'task-2', expected: 'schedule' },
				{ sessionNumber: 4, source: 'task', expected: 'schedule' },
				{ sessionNumber: 5, source: null, expected: 'preview' },
				{ sessionNumber: 6, source: 'chat', expected: 'preview' },
				{ sessionNumber: 7, source: 'slack', laterSource: 'workflow', expected: 'slack' },
				{
					sessionNumber: 8,
					source: N8N_CHAT_PRODUCTION_SOURCE,
					expected: N8N_CHAT_PRODUCTION_SOURCE,
				},
			];
			const expectedIds = new Map<AgentSessionOrigin, string[]>();

			for (const origin of origins) {
				const thread = await createThread({
					sessionNumber: origin.sessionNumber,
					parentThreadId: origin.parentThreadId,
					taskId: origin.taskId,
				});
				await createExecution({
					threadId: thread.id,
					source: origin.source,
					createdAt: new Date('2026-01-01T00:00:00Z'),
				});
				if (origin.laterSource) {
					await createExecution({
						threadId: thread.id,
						source: origin.laterSource,
						createdAt: new Date('2026-01-02T00:00:00Z'),
					});
				}
				expectedIds.set(origin.expected, [...(expectedIds.get(origin.expected) ?? []), thread.id]);
			}

			for (const [origin, ids] of expectedIds) {
				const result = await threadRepo.findByProjectIdPaginated(
					projectId,
					agentId,
					'00000000-0000-4000-8000-000000000001',
					20,
					undefined,
					{ origin },
				);
				expect(new Set(result.threads.map(({ id }) => id))).toEqual(new Set(ids));
			}
		});

		it('keeps only the sessions owned by the requesting user with scope=mine', async () => {
			const owner = await createMember();
			const other = await createMember();
			const mine = await createThread({ sessionNumber: 1, ownerId: owner.id });
			const theirs = await createThread({ sessionNumber: 2, ownerId: other.id });
			const unowned = await createThread({ sessionNumber: 3 });
			for (const thread of [mine, theirs, unowned]) {
				await createExecution({ threadId: thread.id, source: N8N_CHAT_PRODUCTION_SOURCE });
			}
			const list = async (filters: AgentSessionQueryFilters) =>
				(
					await threadRepo.findByProjectIdPaginated(
						projectId,
						agentId,
						owner.id,
						20,
						undefined,
						filters,
					)
				).threads.map(({ id }) => id);

			expect(await list({ origin: N8N_CHAT_PRODUCTION_SOURCE, scope: 'mine' })).toEqual([mine.id]);
			expect(new Set(await list({ origin: N8N_CHAT_PRODUCTION_SOURCE }))).toEqual(
				new Set([mine.id, theirs.id, unowned.id]),
			);
		});

		it('applies inclusive date and status filters before cursor pagination', async () => {
			const start = new Date('2026-01-01T00:00:00Z');
			const middle = new Date('2026-01-02T00:00:00Z');
			const end = new Date('2026-01-03T00:00:00Z');
			const oldest = await createThread({ sessionNumber: 1, updatedAt: start });
			const middleError = await createThread({ sessionNumber: 2, updatedAt: middle });
			const newest = await createThread({ sessionNumber: 3, updatedAt: end });
			await createExecution({ threadId: oldest.id, status: 'success', source: 'workflow' });
			await createExecution({ threadId: middleError.id, status: 'error', source: 'workflow' });
			await createExecution({ threadId: newest.id, status: 'success', source: 'workflow' });
			const filters: AgentSessionQueryFilters = {
				status: 'succeeded',
				origin: 'workflow',
				updatedAfter: start,
				updatedBefore: end,
			};

			const firstPage = await threadRepo.findByProjectIdPaginated(
				projectId,
				agentId,
				'00000000-0000-4000-8000-000000000001',
				1,
				undefined,
				filters,
			);
			const secondPage = await threadRepo.findByProjectIdPaginated(
				projectId,
				agentId,
				'00000000-0000-4000-8000-000000000001',
				1,
				firstPage.nextCursor ?? undefined,
				filters,
			);

			expect(firstPage.threads.map(({ id }) => id)).toEqual([newest.id]);
			expect(secondPage.threads.map(({ id }) => id)).toEqual([oldest.id]);
			expect(secondPage.nextCursor).toBeNull();
		});
	});
});
