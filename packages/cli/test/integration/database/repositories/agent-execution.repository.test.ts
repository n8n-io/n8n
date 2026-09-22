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
import { TransactionRunner, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, EntityManager } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import chunk from 'lodash/chunk';
import type { ErrorReporter, StorageConfig } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
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
import { AgentSessionLock } from '@/modules/agents/agent-session-lock.service';
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import type { AgentExecutionUpdateBroadcaster } from '@/modules/agents/agent-execution-update-broadcaster';
import { AgentInterruptedExecutionSweeper } from '@/modules/agents/agent-interrupted-execution-sweeper';
import { AgentTurnExecutionService } from '@/modules/agents/agent-turn-execution.service';
import type { AgentBackgroundJobService } from '@/modules/agents/background/agent-background-job.service';
import type { AgentWakeService } from '@/modules/agents/background/agent-wake.service';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
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

describe('AgentExecutionRepository', () => {
	let repository: AgentExecutionRepository;
	let threadRepo: AgentExecutionThreadRepository;
	let agentRepo: AgentRepository;
	let attachmentRepo: AgentChatAttachmentRepository;
	let projectId: string;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentExecutionRepository);
		threadRepo = Container.get(AgentExecutionThreadRepository);
		agentRepo = Container.get(AgentRepository);
		attachmentRepo = Container.get(AgentChatAttachmentRepository);
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
		await testDb.terminate();
	});

	function recordingServices(memoryBackend: ReturnType<N8nMemory['getImplementation']> = mock()) {
		const memory = mock<N8nMemory>();
		memory.getImplementation.mockReturnValue(memoryBackend);
		const attachmentService = mock<AgentChatAttachmentService>();
		const executionLogStore = mock<AgentExecutionLogStore>();
		const executionService = new AgentExecutionService(
			mockLogger(),
			repository,
			threadRepo,
			memory,
			mock<Telemetry>(),
			attachmentService,
			executionLogStore,
			mock<StorageConfig>({ modeTag: 'db' }),
			mock<ErrorReporter>(),
			mock<AgentExecutionUpdateBroadcaster>(),
			Container.get(N8NCheckpointStorage),
			Container.get(AgentSessionLock),
		);
		return {
			executionService,
			attachmentService,
			executionLogStore,
			turns: new AgentTurnExecutionService(mockLogger(), executionService),
		};
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
		const { turns, executionService } = recordingServices();
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
		const storage = new N8NCheckpointStorage(
			checkpointRepo,
			mockLogger(),
			new AgentsConfig(),
			Container.get(AgentSessionLock),
		);
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
				new AgentCheckpointRepository(secondConnection, Container.get(TransactionRunner)),
				mockLogger(),
				new AgentsConfig(),
				Container.get(AgentSessionLock),
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
								recording: { ...recording, userMessage: null },
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

	it('keeps a session when admission wins a concurrent deletion', async () => {
		const thread = await createThread();
		const { executionService, turns } = recordingServices();
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
		const admitted = createDeferredPromise();
		const releaseAdmission = createDeferredPromise();
		const saveInContext = repository.saveInContext.bind(repository);
		const saveSpy = vi
			.spyOn(repository, 'saveInContext')
			.mockImplementationOnce(async (execution, ctx) => {
				const saved = await saveInContext(execution, ctx);
				admitted.resolve();
				await releaseAdmission.promise;
				return saved;
			});
		const deleteSpy = vi.spyOn(threadRepo, 'deleteSession');

		try {
			const start = turns.startExecution(params, recorder.startedAt);
			await admitted.promise;
			const deletion = executionService.deleteThread(projectId, agentId, thread.id, uuid());
			const deletionRejected = expect(deletion).rejects.toThrow('active work');
			await new Promise<void>((resolve) => setTimeout(resolve, 0));
			expect(deleteSpy).not.toHaveBeenCalled();
			releaseAdmission.resolve();
			const executionId = await start;
			await deletionRejected;
			expect(await threadRepo.findOneBy({ id: thread.id })).not.toBeNull();

			recorder.record({ type: 'finish', finishReason: 'stop' });
			await turns.finalizeExecution({
				executionId,
				executionStarted: true,
				params: { ...params, record: recorder.getMessageRecord() },
			});
		} finally {
			releaseAdmission.resolve();
			saveSpy.mockRestore();
			deleteSpy.mockRestore();
		}
	});

	it('rejects a continuation when concurrent deletion wins admission', async () => {
		const thread = await createThread();
		const { executionService, turns } = recordingServices();
		const deleted = createDeferredPromise();
		const releaseDeletion = createDeferredPromise();
		const deleteSession = threadRepo.deleteSession.bind(threadRepo);
		const deleteSpy = vi
			.spyOn(threadRepo, 'deleteSession')
			.mockImplementationOnce(async (...args) => {
				const result = await deleteSession(...args);
				deleted.resolve();
				await releaseDeletion.promise;
				return result;
			});
		const admissionSpy = vi.spyOn(threadRepo, 'findOrCreate');

		try {
			const deletion = executionService.deleteThread(projectId, agentId, thread.id, uuid());
			await deleted.promise;
			const continuation = turns.startExecution(
				{
					access: { accessScope: 'project', ownerId: null },
					threadId: thread.id,
					agentId,
					agentName: 'Test Agent',
					projectId,
					userMessage: 'Continue',
					sessionMode: 'existing',
				},
				new Date(),
			);
			const deletionCompleted = expect(deletion).resolves.toBe(true);
			const continuationRejected = expect(continuation).rejects.toMatchObject({
				phase: 'create',
				cause: expect.objectContaining({ message: 'Session not found' }),
			});
			await new Promise<void>((resolve) => setTimeout(resolve, 0));
			expect(admissionSpy).not.toHaveBeenCalled();
			releaseDeletion.resolve();
			await deletionCompleted;
			await continuationRejected;
			expect(await threadRepo.findOneBy({ id: thread.id })).toBeNull();
			expect(await repository.findByThreadIdOrdered(thread.id)).toEqual([]);
		} finally {
			releaseDeletion.resolve();
			deleteSpy.mockRestore();
			admissionSpy.mockRestore();
		}
	});

	it('blocks parent deletion while a descendant execution is running', async () => {
		const parent = await createThread();
		const child = await createThread({
			id: uuid(),
			sessionNumber: 2,
			parentThreadId: parent.id,
			parentAgentId: agentId,
		});
		const execution = await createExecution({ threadId: child.id, status: 'running' });
		const { executionService } = recordingServices();

		await expect(
			executionService.deleteThread(projectId, agentId, parent.id, uuid()),
		).rejects.toThrow('active work');
		await repository.update(execution.id, { status: 'success' });
		expect(await executionService.deleteThread(projectId, agentId, parent.id, uuid())).toBe(true);
		expect(await threadRepo.findOneBy({ id: child.id })).not.toBeNull();
	});

	it('blocks deletion only while a background job is running', async () => {
		const thread = await createThread();
		const jobs = Container.get(AgentBackgroundJobRepository);
		const jobId = uuid();
		await jobs.insertJob({
			id: jobId,
			kind: 'subagent',
			parentAgentId: agentId,
			parentThreadId: thread.id,
			parentResourceId: 'resource-1',
			parentPrincipalHash: 'principal-hash',
			title: 'Research',
			subAgentId: agentId,
			childThreadId: uuid(),
			timeoutAt: new Date(Date.now() + 60_000),
		});
		const { executionService } = recordingServices();

		await expect(
			executionService.deleteThread(projectId, agentId, thread.id, uuid()),
		).rejects.toThrow('active work');
		await jobs.settleIfRunning(jobId, { status: 'completed' });
		expect(await executionService.deleteThread(projectId, agentId, thread.id, uuid())).toBe(true);
		await jobs.delete({ id: jobId });
	});

	it('does not restore a deleted session from a delayed checkpoint save', async () => {
		const thread = await createThread();
		const execution = await createExecution({ threadId: thread.id, status: 'running' });
		const checkpointRepo = Container.get(AgentCheckpointRepository);
		const storage = Container.get(N8NCheckpointStorage);
		const runId = uuid();
		const state: SerializableAgentState = {
			status: 'suspended',
			persistence: {
				threadId: thread.id,
				resourceId: 'resource-1',
				hostRunId: execution.id,
			},
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {},
		};
		await storage.save(runId, state, agentId, projectId);
		await repository.update(execution.id, { status: 'success' });
		const { executionService } = recordingServices();
		expect(await executionService.deleteThread(projectId, agentId, thread.id, uuid())).toBe(true);

		await expect(storage.save(runId, state, agentId, projectId)).rejects.toThrow(
			'no longer active',
		);
		expect(await checkpointRepo.findByRunId(runId)).toBeNull();
		expect(await threadRepo.findOneBy({ id: thread.id })).toBeNull();
	});

	it('rejects attachment metadata for a deleted session', async () => {
		const thread = await createThread();
		const { executionService } = recordingServices();
		expect(await executionService.deleteThread(projectId, agentId, thread.id, uuid())).toBe(true);
		const attachment = buildAttachment(thread.id);

		await expect(
			Container.get(AgentSessionLock).run(
				thread.id,
				async (ctx) =>
					await attachmentRepo.saveForSession(
						attachment,
						{
							threadId: thread.id,
							agentId,
							projectId,
							access: { accessScope: 'project', ownerId: null },
							sessionMode: 'existing',
						},
						ctx,
					),
			),
		).rejects.toThrow('Session not found');
		expect(await attachmentRepo.findOneBy({ id: attachment.id })).toBeNull();
	});

	it('records one accepted resume and one failed attempt when separate connections claim the same checkpoint', async () => {
		const fixture = await startSuspendedApprovalRun();
		const { outcomes, onResumeClaimed } = await resumeApprovalFromSeparateConnections(fixture);

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
		const { executionService } = recordingServices();
		const access = { accessScope: 'user' as const, ownerId: owner.id };
		const { thread } = await threadRepo.findOrCreate(
			uuid(),
			agentId,
			'Test Agent',
			projectId,
			access,
			{},
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
			{ accessScope: 'user' as const, ownerId: other.id },
			{ accessScope: 'project' as const, ownerId: null },
		]) {
			await expect(
				threadRepo.findOrCreate(thread.id, agentId, 'Test Agent', projectId, incompatible, {}),
			).rejects.toThrow('Session not found');
		}
		expect(
			await threadRepo.findOrCreate(thread.id, agentId, 'Test Agent', projectId, access, {}),
		).toMatchObject({ created: false, thread: access });
		const child = await threadRepo.findOrCreate(
			uuid(),
			agentId,
			'Test Agent',
			projectId,
			{ accessScope: 'user', ownerId: null },
			{},
			{ parentThreadId: thread.id, parentAgentId: agentId },
		);
		expect(child.thread).toMatchObject(access);
		expect(
			await executionService.canUseDraftThread(child.thread.id, projectId, agentId, owner.id),
		).toBe(false);
		const sharedChild = await threadRepo.findOrCreate(
			uuid(),
			agentId,
			'Test Agent',
			projectId,
			{ accessScope: 'user', ownerId: null },
			{},
			{ parentThreadId: shared.id, parentAgentId: agentId },
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
