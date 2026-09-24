import type {
	AgentSessionOrigin,
	AgentSessionQueryFilters,
	AgentSessionStatus,
} from '@n8n/api-types';
import {
	Agent as RuntimeAgent,
	Tool,
	type SerializableAgentState,
	type StreamChunk,
} from '@n8n/agents';
import { createTeamProject, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { AgentsConfig, AiConfig } from '@n8n/config';
import type { OperationContext, User } from '@n8n/db';
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
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import type { AgentExecutionUpdateBroadcaster } from '@/modules/agents/agent-execution-update-broadcaster';
import { AgentInterruptedExecutionSweeper } from '@/modules/agents/agent-interrupted-execution-sweeper';
import { AgentTurnExecutionService } from '@/modules/agents/agent-turn-execution.service';
import {
	AgentMessageQueueService,
	type ClaimedAgentMessage,
} from '@/modules/agents/agent-message-queue.service';
import { AgentMessageQueueRepository } from '@/modules/agents/repositories/agent-message-queue.repository';
import { AgentTurnAlreadyRunningError } from '@/modules/agents/agent-turn-already-running.error';
import { EXECUTION_METADATA_KEY } from '@/modules/agents/types/agent-queued-message';
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

import { createMember, createAdmin } from '../../shared/db/users';

// Share the transaction class loaded by the built BaseRepository.
const { TypeOrmTransaction, TypeOrmTransactionRunner } = createRequire(__filename)(
	'@n8n/db/dist/services/typeorm-transaction',
) as typeof import('@n8n/db/dist/services/typeorm-transaction');

describe('AgentExecutionRepository', () => {
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
			mock<AgentExecutionUpdateBroadcaster>(),
		);
		return {
			txRunner,
			threads,
			queue,
			queueRepository,
			checkpointStorage,
			executionService,
			attachmentService,
			executionLogStore,
			turns: new AgentTurnExecutionService(
				mockLogger(),
				executionService,
				mock<AgentChatExecutionService>(),
				queue,
			),
		};
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

	async function collect(stream: AsyncIterable<StreamChunk>) {
		const chunks: StreamChunk[] = [];
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
							: []),
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
				.checkpoint(store);
		return { action, makeAgent };
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
		};
		const checkpointRepo = Container.get(AgentCheckpointRepository);
		const { action, makeAgent } = createApprovalAgentFactory(threadId, user?.id, approvals);
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
			const executionId = await start;
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

		expect(await fixture.checkpointRepo.findByRunId(fixture.suspension.runId)).toMatchObject({
			expired: true,
			state: null,
		});
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
		};
		const recorder = new ExecutionRecorder();
		const executionId = await turns.startExecution(params, recorder.startedAt);
		const timeline: TimelineEvent[] = [{ type: 'text', content: 'Saved output', timestamp: 1 }];
		executionService.recordTimelineSnapshot({ ...params, executionId, timeline });
		await vi.waitFor(async () =>
			expect((await repository.findOneByOrFail({ id: executionId })).timeline).toEqual(timeline),
		);
		recorder.record({ type: 'text-delta', id: 'text-1', delta: 'Unsaved final output' });
		recorder.record({ type: 'finish', finishReason: 'stop' });
		const record = recorder.getMessageRecord();
		const update = vi
			.spyOn(repository, 'updateIfRunning')
			.mockRejectedValueOnce(new Error('database unavailable'));
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
		) {
			const recorder = new ExecutionRecorder();
			recorder.record({ type: 'finish', finishReason: 'stop' });
			await services.executionService.finalizeExecution(item.admission.executionId, {
				...item.recording,
				record: recorder.getMessageRecord(),
			});
			await services.queue.settle(item.thread.id, item.admission.executionId);
		}

		it('lists only pending Preview input and removes its attachments without affecting the active run', async () => {
			const services = recordingServices();
			const threadId = uuid();
			const target = { projectId, agentId, threadId, userId: owner.id };
			await services.queue.enqueue(input(threadId, 'active', 'new'));
			const active = await claim(services, threadId);
			const pendingInput = input(threadId, 'pending');
			pendingInput.payload.attachments = [
				{ id: 'pending-file', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 },
			];
			const pending = await services.queue.enqueue(pendingInput);
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
			expect(await services.queue.listPending(target)).toEqual({ items: [] });
			expect(services.attachmentService.deleteByIds).toHaveBeenCalledWith(['pending-file']);
			expect((await repository.findOneByOrFail({ id: active.admission.executionId })).status).toBe(
				'running',
			);
			await finish(services, active);
		});

		it('edits pending text without changing identity, attachments, or queue position', async () => {
			const services = recordingServices();
			const threadId = uuid();
			const data = input(threadId, 'original', 'new');
			data.payload.attachments = [
				{ id: 'file', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 },
			];
			const first = await services.queue.enqueue(data);
			const second = await services.queue.enqueue(input(threadId, 'second'));
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
			const stored = await services.queueRepository.findOneByOrFail({ id: first.id });
			expect(stored).toMatchObject({
				id: first.id,
				createdAt: first.createdAt,
				source: first.source,
				payload: { ...first.payload, message: 'updated' },
			});
			expect((await services.queue.listPending(target)).items.map(({ id }) => id)).toEqual([
				first.id,
				second.id,
			]);
			expect(services.attachmentService.deleteByIds).not.toHaveBeenCalled();
			const claimed = await claim(services, threadId);
			expect(claimed.item.payload.message).toBe('updated');
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
			'serializes a concurrent claim when %s wins against %s',
			async (winner, operation) => {
				const local = recordingServices();
				const remote = recordingServices(undefined, peer);
				const threadId = uuid();
				const item = await local.queue.enqueue(input(threadId, 'first', 'new'));
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
					await finish(local, claimed);
				} else if (operation === 'edit') {
					const claimed = await second;
					if (!claimed) throw new Error('Expected a claim');
					expect(claimed.item.payload.message).toBe('edited');
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
			const first = await local.queue.enqueue(input(threadId, 'first', 'new'));
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
				const second = local.queue.enqueue(input(threadId, 'second'));
				const ctx = await inserted.promise;
				const third = remote.queue.enqueue(input(threadId, 'third'));
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
			await expect(
				local.executionService.startExecutionRecording(winner.item.recording, new Date()),
			).rejects.toBeInstanceOf(AgentTurnAlreadyRunningError);
			const independentId = uuid();
			await remote.queue.enqueue(input(independentId, 'independent', 'new'));
			const independent = await claim(remote, independentId);
			await finish(remote, independent);
			await finish(winner.services, winner.item);
			for (const message of ['second', 'third']) {
				const next = await claim(local, threadId);
				expect(next.item.payload.message).toBe(message);
				await finish(local, next);
			}
			expect(await local.queueRepository.count()).toBe(0);
			const later = await local.queue.enqueue(input(threadId, 'later'));
			expect(BigInt(later.id)).toBeGreaterThan(BigInt(independent.item.id));
		});

		it('rolls back acceptance and claim without partial session or execution records', async () => {
			const services = recordingServices();
			const threadId = uuid();
			const insert = services.queueRepository.enqueue.bind(services.queueRepository);
			const failedInsert = vi
				.spyOn(services.queueRepository, 'enqueue')
				.mockImplementationOnce(async (...args) => {
					await insert(...args);
					throw new Error('acceptance failed');
				});
			await expect(services.queue.enqueue(input(threadId, 'first', 'new'))).rejects.toThrow(
				'acceptance failed',
			);
			failedInsert.mockRestore();
			expect(await threadRepo.findOneBy({ id: threadId })).toBeNull();
			expect(await services.queueRepository.count()).toBe(0);
			const accepted = await services.queue.enqueue(input(threadId, 'first', 'new'));
			const failedLink = vi
				.spyOn(services.queueRepository, 'linkExecution')
				.mockResolvedValueOnce(false);
			await expect(claim(services, threadId)).rejects.toBeInstanceOf(AgentTurnAlreadyRunningError);
			failedLink.mockRestore();
			expect(await repository.countBy({ threadId })).toBe(0);
			expect(await services.queueRepository.findDeliveryState(accepted.id)).toMatchObject({
				executionId: null,
			});
			await finish(services, await claim(services, threadId));
		});

		it('enforces active-slot uniqueness and prevents execution deletion from requeuing a message', async () => {
			const services = recordingServices();
			const threadId = uuid();
			await services.queue.enqueue(input(threadId, 'first', 'new'));
			const pending = await services.queue.enqueue(input(threadId, 'second'));
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
			await local.queue.enqueue(input(threadId, 'interrupted', 'new'));
			await local.queue.enqueue(input(threadId, 'next'));
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
			expect(next.item.payload.message).toBe('next');
			await expect(finish(remote, active)).rejects.toThrow('no longer running');
			await finish(local, next);
			expect(
				(await repository.findByThreadIdOrdered(threadId)).map(({ userMessage, status }) => ({
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
				await local.queue.enqueue(input(threadId, 'approval', 'new'));
				const pending = await local.queue.enqueue(input(threadId, 'later'));
				const active = await claim(local, threadId);
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
				const resumedId = await remote.executionService.startExecutionRecording(
					{ ...active.recording, userMessage: null, resumeRunId: runId },
					new Date(),
				);
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
					admission: { executionId: resumedId, startedAt: new Date() },
				});
				const next = await claim(local, threadId);
				expect(next.item.id).toBe(pending.id);
				await local.queue.settle(threadId, active.admission.executionId);
				expect(await local.queueRepository.findDeliveryState(next.item.id)).toMatchObject({
					executionId: next.admission.executionId,
				});
				await finish(local, next);
			},
		);

		it('advances after approval expiry without waiting for pruning', async () => {
			const services = recordingServices();
			const threadId = uuid();
			await services.queue.enqueue(input(threadId, 'approval', 'new'));
			const pending = await services.queue.enqueue(input(threadId, 'later'));
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

		it('removes pending input and attachments on session deletion and never recreates it', async () => {
			const services = recordingServices();
			const threadId = uuid();
			const attachment = await attachmentRepo.save(buildAttachment(threadId));
			const accepted = input(threadId, 'pending', 'new');
			accepted.payload.attachments = [
				{
					id: attachment.id,
					fileName: attachment.fileName,
					mimeType: attachment.mimeType,
					sizeBytes: attachment.fileSizeBytes,
				},
			];
			await services.queue.enqueue(accepted);
			expect(
				await services.executionService.deleteThread(projectId, agentId, threadId, owner.id),
			).toBe(true);
			expect(await services.queueRepository.countBy({ threadId })).toBe(0);
			expect(await attachmentRepo.findOneBy({ id: attachment.id })).toBeNull();
			expect(services.attachmentService.deleteStoredData).toHaveBeenCalledWith(
				[attachment.binaryDataId],
				{ threadId },
			);
			expect(await services.queue.claimNext(threadId, async () => true)).toBeNull();
			await expect(services.queue.enqueue(input(threadId, 'late'))).rejects.toThrow();
			expect(await threadRepo.findOneBy({ id: threadId })).toBeNull();
		});

		it('cascades agent deletion through pending queue rows', async () => {
			const services = recordingServices();
			const threadId = uuid();
			await services.queue.enqueue(input(threadId, 'pending', 'new'));
			await agentRepo.delete(agentId);
			expect(await services.queueRepository.countBy({ threadId })).toBe(0);
		});
	});

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
		it('filters all composite statuses using the latest execution and recovered failures', async () => {
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
			expect(await idsFor('succeeded')).toEqual([succeeded.id]);
			expect(new Set(await idsFor('error'))).toEqual(new Set([recovered.id, errored.id]));

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
