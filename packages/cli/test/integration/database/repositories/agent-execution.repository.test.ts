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
import {
	AgentExecutionService,
	type StartedExecution,
} from '@/modules/agents/agent-execution.service';
import { AgentSessionLeaseLostError } from '@/modules/agents/agent-session-lease-lost.error';
import { AgentSessionLeaseService } from '@/modules/agents/agent-session-lease.service';
import type { AgentExecutionUpdateBroadcaster } from '@/modules/agents/agent-execution-update-broadcaster';
import { AgentInterruptedExecutionSweeper } from '@/modules/agents/agent-interrupted-execution-sweeper';
import { AgentTurnAlreadyRunningError } from '@/modules/agents/agent-turn-already-running.error';
import { AgentTurnExecutionService } from '@/modules/agents/agent-turn-execution.service';
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
import {
	AgentExecutionRepository,
	EXECUTION_LIVENESS_GRACE_MS,
} from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createMember, createAdmin } from '../../shared/db/users';

// Share the transaction class loaded by the built BaseRepository.
const { TypeOrmTransaction, TypeOrmTransactionRunner } = createRequire(__filename)(
	'@n8n/db/dist/services/typeorm-transaction',
) as typeof import('@n8n/db/dist/services/typeorm-transaction');

const isPostgres = process.env.DB_TYPE === 'postgresdb';

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
		messageQueueEnabled = true,
	) {
		const txRunner = new TypeOrmTransactionRunner(
			connection ?? repository.manager.connection,
			mockLogger(),
		);
		const executions = connection ? new AgentExecutionRepository(connection, txRunner) : repository;
		const threads = connection
			? new AgentExecutionThreadRepository(connection, txRunner)
			: threadRepo;
		const memory = mock<N8nMemory>();
		memory.getImplementation.mockReturnValue(memoryBackend);
		const sessionLeases = new AgentSessionLeaseService(mockLogger(), executions);
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
			Container.get(N8NCheckpointStorage),
			txRunner,
			sessionLeases,
			Object.assign(new AgentsConfig(), { messageQueueEnabled }),
		);
		return {
			txRunner,
			threads,
			sessionLeases,
			executionService,
			attachmentService,
			executionLogStore,
			turns: new AgentTurnExecutionService(
				mockLogger(),
				executionService,
				mock<AgentChatExecutionService>(),
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
				expect(await repository.existsBy({ threadId, status: 'running' })).toBe(true);
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

	async function startSuspendedApprovalRun(user?: User, approvals = 1, messageQueueEnabled = true) {
		const { turns, executionService } = recordingServices(
			undefined,
			undefined,
			messageQueueEnabled,
		);
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
		const storage = new N8NCheckpointStorage(checkpointRepo, mockLogger(), new AgentsConfig());
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
		const secondConnection = await new DataSource({
			...repository.manager.connection.options,
			name: uuid(),
		}).initialize();
		try {
			const otherStorage = new N8NCheckpointStorage(
				new AgentCheckpointRepository(secondConnection),
				mockLogger(),
				new AgentsConfig(),
			);
			// The admitted attempt waits until the other one is rejected, so the
			// other attempt competes for the session lease while it is held.
			const oneRejected = createDeferredPromise();
			const onResumeClaimed = vi.fn();
			const attempts = [storage, otherStorage].map(async (checkpointStorage) => {
				let agent: ReturnType<typeof makeAgent> | undefined;
				try {
					const store = checkpointStorage.getStorage(agentId);
					agent = makeAgent({
						...store,
						load: async (key) => {
							await oneRejected.promise;
							return await store.load(key);
						},
					});
					return await collect(
						turns.execute({
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
				} catch (error) {
					oneRejected.resolve();
					throw error;
				} finally {
					await agent?.close();
				}
			});

			return { outcomes: await Promise.allSettled(attempts), onResumeClaimed };
		} finally {
			await secondConnection.destroy();
		}
	}

	// TODO(AGENT-1031): Remove with the message queue flag.
	async function resumeApprovalWithoutLeaseFromSeparateConnections(
		fixture: Awaited<ReturnType<typeof startSuspendedApprovalRun>>,
	) {
		const { common, makeAgent, recording, storage, suspension, turns } = fixture;
		const secondConnection = await new DataSource({
			...repository.manager.connection.options,
			name: uuid(),
		}).initialize();
		try {
			const otherStorage = new N8NCheckpointStorage(
				new AgentCheckpointRepository(secondConnection),
				mockLogger(),
				new AgentsConfig(),
			);
			const bothLoaded = createDeferredPromise<boolean>();
			let loaded = 0;
			const onResumeClaimed = vi.fn();
			const attempts = [storage, otherStorage].map(async (checkpointStorage) => {
				let agent: ReturnType<typeof makeAgent> | undefined;
				try {
					const store = checkpointStorage.getStorage(agentId);
					agent = makeAgent({
						...store,
						load: async (key) => {
							const state = await store.load(key);
							if (++loaded === 2) bothLoaded.resolve(true);
							if (!(await bothLoaded.promise)) {
								throw new Error('A resume attempt failed before both checkpoints loaded');
							}
							return state;
						},
					});
					return await collect(
						turns.execute({
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
				} catch (error) {
					bothLoaded.resolve(false);
					throw error;
				} finally {
					await agent?.close();
				}
			});

			return { outcomes: await Promise.allSettled(attempts), onResumeClaimed };
		} finally {
			await secondConnection.destroy();
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

	it('admits one of two resumes from separate connections and rejects the other as busy', async () => {
		const fixture = await startSuspendedApprovalRun();
		const { outcomes, onResumeClaimed } = await resumeApprovalFromSeparateConnections(fixture);

		expect(outcomes.map(({ status }) => status).sort()).toEqual(['fulfilled', 'rejected']);
		const rejected = outcomes.find(
			(outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected',
		);
		expect(rejected?.reason).toBeInstanceOf(AgentTurnAlreadyRunningError);
		expect(onResumeClaimed).toHaveBeenCalledOnce();
		expect(fixture.action).toHaveBeenCalledOnce();
		// The rejected attempt records nothing: the lease refused it before recording.
		const executions = await repository.findByThreadIdOrdered(fixture.threadId);
		expect(executions.map(({ status }) => status)).toEqual(['success', 'success']);
		const resumed = executions.find(({ hitlStatus }) => hitlStatus === 'resumed');
		expect(resumed).toMatchObject({ userMessage: null, status: 'success' });
		expect(resumed?.timeline).toContainEqual(expect.objectContaining({ type: 'hitl-response' }));
		expect(await fixture.checkpointRepo.findByRunId(fixture.suspension.runId)).toMatchObject({
			expired: true,
			state: null,
		});
	});

	// TODO(AGENT-1031): Remove with the message queue flag.
	it('records one accepted resume and one failed attempt without the message queue flag', async () => {
		const fixture = await startSuspendedApprovalRun(undefined, 1, false);
		const { outcomes, onResumeClaimed } =
			await resumeApprovalWithoutLeaseFromSeparateConnections(fixture);

		expect(outcomes.map(({ status }) => status).sort()).toEqual(['fulfilled', 'rejected']);
		expect(onResumeClaimed).toHaveBeenCalledOnce();
		expect(fixture.action).toHaveBeenCalledOnce();
		const executions = await repository.findByThreadIdOrdered(fixture.threadId);
		expect(executions).toHaveLength(3);
		expect(executions.map(({ status }) => status).sort()).toEqual(['error', 'success', 'success']);
		const resumed = executions.find(({ hitlStatus }) => hitlStatus === 'resumed');
		expect(resumed).toMatchObject({ userMessage: null, status: 'success' });
		expect(resumed?.timeline).toContainEqual(expect.objectContaining({ type: 'hitl-response' }));
		const rejected = executions.find(({ status }) => status === 'error');
		expect(rejected).toMatchObject({ userMessage: null, hitlStatus: null });
		expect(rejected?.timeline ?? []).not.toContainEqual(
			expect.objectContaining({ type: 'hitl-response' }),
		);
		expect(await fixture.checkpointRepo.findByRunId(fixture.suspension.runId)).toMatchObject({
			expired: true,
			state: null,
		});
	});

	describe('session lease', () => {
		const finishedRecord = () => {
			const recorder = new ExecutionRecorder();
			recorder.record({ type: 'finish', finishReason: 'stop' });
			return recorder.getMessageRecord();
		};

		const startParams = (threadId: string) => ({
			access: { accessScope: 'project' as const, ownerId: null },
			threadId,
			agentId,
			agentName: 'Test Agent',
			projectId,
			userMessage: 'Run',
			sessionMode: 'existing' as const,
		});

		it('records only one of two turns that start on a session from separate connections', async () => {
			const thread = await createThread();
			const params = startParams(thread.id);
			const services = [recordingServices(), recordingServices(mock(), peer)];

			const results = await Promise.allSettled(
				services.map(
					async ({ executionService }) =>
						await executionService.startExecutionRecording(params, new Date()),
				),
			);

			const rejected = results.filter(
				(result): result is PromiseRejectedResult => result.status === 'rejected',
			);
			expect(rejected).toHaveLength(1);
			expect(rejected[0].reason).toBeInstanceOf(AgentTurnAlreadyRunningError);
			expect(await repository.findByThreadIdOrdered(thread.id)).toEqual([
				expect.objectContaining({ status: 'running' }),
			]);

			const winner = results.findIndex(({ status }) => status === 'fulfilled');
			const started = results[winner] as PromiseFulfilledResult<StartedExecution>;
			await services[winner].executionService.finalizeExecution(started.value.executionId, {
				...params,
				record: finishedRecord(),
			});
		});

		const makeStale = async (executionId: string) =>
			await repository.update(executionId, {
				updatedAt: new Date(Date.now() - EXECUTION_LIVENESS_GRACE_MS - 60_000),
			});

		it('takes over the session from a turn whose heartbeat is stale', async () => {
			const thread = await createThread();
			const params = startParams(thread.id);
			const local = recordingServices();
			const remote = recordingServices(mock(), peer);
			const stale = await local.executionService.startExecutionRecording(params, new Date());
			await expect(
				remote.executionService.startExecutionRecording(params, new Date()),
			).rejects.toBeInstanceOf(AgentTurnAlreadyRunningError);
			await makeStale(stale.executionId);

			const takeover = await remote.executionService.startExecutionRecording(params, new Date());

			expect(await repository.findOneByOrFail({ id: stale.executionId })).toMatchObject({
				status: 'interrupted',
			});
			expect(await repository.findOneByOrFail({ id: takeover.executionId })).toMatchObject({
				status: 'running',
			});
			await local.sessionLeases.renew(stale.executionId);
			expect(stale.leaseSignal?.reason).toBeInstanceOf(AgentSessionLeaseLostError);
			await expect(
				local.executionService.finalizeExecution(stale.executionId, {
					...params,
					record: finishedRecord(),
				}),
			).rejects.toBeInstanceOf(AgentSessionLeaseLostError);
			await remote.executionService.finalizeExecution(takeover.executionId, {
				...params,
				record: finishedRecord(),
			});
		});

		it('rejects the timeline and terminal writes of a turn whose session was taken over', async () => {
			const thread = await createThread();
			const params = startParams(thread.id);
			const local = recordingServices();
			const remote = recordingServices(mock(), peer);
			const stale = await local.executionService.startExecutionRecording(params, new Date());
			await makeStale(stale.executionId);
			const takeover = await remote.executionService.startExecutionRecording(params, new Date());

			local.executionService.recordTimelineSnapshot({
				...params,
				executionId: stale.executionId,
				timeline: [{ type: 'text', content: 'Late output', timestamp: 1 }],
			});
			await expect(
				local.executionService.finalizeExecution(stale.executionId, {
					...params,
					record: finishedRecord(),
				}),
			).rejects.toBeInstanceOf(AgentSessionLeaseLostError);

			expect(await repository.findOneByOrFail({ id: stale.executionId })).toMatchObject({
				status: 'interrupted',
				timeline: null,
			});
			await remote.executionService.finalizeExecution(takeover.executionId, {
				...params,
				record: finishedRecord(),
			});
		});

		it.skipIf(!isPostgres)(
			'admits a start that waits for the terminal write of a stale-looking turn',
			async () => {
				const thread = await createThread();
				const params = startParams(thread.id);
				const finishing = await createExecution({
					threadId: thread.id,
					status: 'running',
					startedAt: new Date(),
				});
				await makeStale(finishing.id);
				const peerTxRunner = new TypeOrmTransactionRunner(peer, mockLogger());
				const peerExecutions = new AgentExecutionRepository(peer, peerTxRunner);
				const written = createDeferredPromise<OperationContext>();
				const commit = createDeferredPromise();
				const terminalWrite = peerTxRunner.run({}, async (ctx) => {
					await peerExecutions.updateIfRunning(
						finishing.id,
						{
							status: 'success',
							stoppedAt: new Date(),
							duration: 1,
							timeline: null,
							storedAt: 'db',
							error: null,
							failureSummary: null,
						},
						ctx,
					);
					written.resolve(ctx);
					await commit.promise;
				});
				const peerCtx = await written.promise;
				const { executionService } = recordingServices();

				const start = executionService.startExecutionRecording(params, new Date());
				await waitForPeerLock(peerCtx);
				commit.resolve();
				await terminalWrite;
				const started = await start;

				expect(await repository.findOneByOrFail({ id: finishing.id })).toMatchObject({
					status: 'success',
				});
				expect(await repository.findOneByOrFail({ id: started.executionId })).toMatchObject({
					status: 'running',
				});
				await executionService.finalizeExecution(started.executionId, {
					...params,
					record: finishedRecord(),
				});
			},
		);
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
				Object.assign(new AgentsConfig(), { messageQueueEnabled: true }),
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
		const { executionId } = await turns.startExecution(params, recorder.startedAt);
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
			updatedAt: new Date(Date.now() - EXECUTION_LIVENESS_GRACE_MS - 1),
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

	describe('liveness', () => {
		it('refreshes the heartbeat of a running execution on the database clock', async () => {
			const thread = await createThread();
			const running = await createExecution({ threadId: thread.id, status: 'running' });
			const finished = await createExecution({ threadId: thread.id });
			await repository.update(running.id, { updatedAt: new Date(0) });
			const before = new Date();

			// An instance clock far in the past must not reach the row.
			vi.useFakeTimers({ now: new Date('2000-01-01T00:00:00.000Z'), toFake: ['Date'] });
			let touched: boolean;
			let touchedFinished: boolean;
			try {
				touched = await repository.touchRunning(running.id);
				touchedFinished = await repository.touchRunning(finished.id);
			} finally {
				vi.useRealTimers();
			}

			expect(touched).toBe(true);
			expect(touchedFinished).toBe(false);
			const { updatedAt } = await repository.findOneByOrFail({ id: running.id });
			expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 60_000);
		});

		it('finds only running executions whose heartbeat is older than the grace', async () => {
			const thread = await createThread();
			const stale = await createExecution({ threadId: thread.id, status: 'running' });
			await createExecution({ threadId: thread.id, status: 'running' });
			const finished = await createExecution({ threadId: thread.id });
			const staleSince = new Date(Date.now() - EXECUTION_LIVENESS_GRACE_MS - 60_000);
			await repository.update(stale.id, { updatedAt: staleSince });
			await repository.update(finished.id, { updatedAt: staleSince });

			const found = await repository.findStaleRunning();

			expect(found.map(({ id }) => id)).toEqual([stale.id]);
		});
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
