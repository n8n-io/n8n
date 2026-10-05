import type { SerializableAgentState } from '@n8n/agents';
import { LockService, type Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { AgentsConfig } from '@n8n/config';
import type { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { v4 as uuid, v7 as uuidv7 } from 'uuid';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { AgentConversationStateService } from '@/modules/agents/agent-conversation-state.service';
import type { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import type { AgentExecutionUpdateBroadcaster } from '@/modules/agents/agent-execution-update-broadcaster';
import { hashAgentSandboxPrincipal } from '@/modules/agents/agent-sandbox-principal';
import {
	AgentBackgroundJobService,
	EXPIRED_BACKGROUND_CHECKPOINT_ERROR,
	REPLACED_PAUSE_GROUP_NOTICE,
} from '@/modules/agents/background/agent-background-job.service';
import { AgentWakeService, WAKE_DEBOUNCE_MS } from '@/modules/agents/background/agent-wake.service';
import type { AgentBackgroundJob } from '@/modules/agents/entities/agent-background-job.entity';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import type { ChatIntegrationRegistry } from '@/modules/agents/integrations/agent-chat-integration';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import type { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import type { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';

import { createOwner } from '../../shared/db/users';

describe('AgentBackgroundJobRepository', () => {
	let repository: AgentBackgroundJobRepository;
	let agentRepository: AgentRepository;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentBackgroundJobRepository);
		agentRepository = Container.get(AgentRepository);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		const agent = agentRepository.create({
			id: uuid(),
			name: 'Test Agent',
			projectId: project.id,
			integrations: [],
			tools: {},
			skills: {},
		} as Partial<Agent>);
		await agentRepository.save(agent);
		agentId = agent.id;
	});

	afterEach(async () => {
		await repository.delete({});
		await agentRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertJob(
		overrides: Partial<AgentBackgroundJob> & { id: string; parentThreadId: string },
	) {
		await repository.insert({
			kind: 'subagent',
			status: 'completed',
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:user-1',
			parentPrincipalHash: 'principal-hash',
			title: 'Research',
			subAgentId: uuid(),
			childThreadId: uuid(),
			settledAt: new Date(),
			...overrides,
		});
	}

	it('admits five active tasks beside a paused group and fences concurrent spawns', async () => {
		const parentThreadId = uuid();
		const agent = await agentRepository.findOneByOrFail({ id: agentId });
		await Container.get(AgentExecutionThreadRepository).insert({
			id: parentThreadId,
			projectId: agent.projectId,
			agentId,
			agentName: agent.name,
		});
		for (let index = 0; index < 5; index++) {
			await insertJob({
				id: uuid(),
				parentThreadId,
				status: 'paused',
				pauseRequestId: agentId,
				result: 'Saved progress',
				notifiedAt: new Date(),
			});
		}
		await insertJob({ id: uuid(), parentThreadId, kind: 'workflow', status: 'running' });
		const jobs = Array.from({ length: 6 }, () => ({
			id: uuid(),
			kind: 'subagent' as const,
			parentAgentId: agentId,
			parentThreadId,
			parentResourceId: 'draft-chat:user-1',
			parentPrincipalHash: 'principal-hash',
			title: 'New task',
			subAgentId: agentId,
			childThreadId: uuid(),
			timeoutAt: new Date(Date.now() + 60_000),
		}));
		const admitted = await Promise.all(
			jobs.map(async (job) => await repository.insertSubAgentJobIfCapacity(job, 5)),
		);
		expect(admitted.filter(Boolean)).toHaveLength(5);
		const active = (await repository.findByParentThread(parentThreadId)).filter(
			(job) => job.kind === 'subagent' && job.status === 'running',
		);
		await repository.update(active[0].id, { status: 'suspended' });
		expect(await repository.countActiveSubAgentsByParentThread(parentThreadId)).toBe(5);
		expect(await repository.insertSubAgentJobIfCapacity({ ...jobs[0], id: uuid() }, 5)).toBe(false);
		const paused = (await repository.findByParentThread(parentThreadId)).filter(
			(job) => job.status === 'paused',
		);
		const ids = paused.map((job) => job.id);
		const timeoutAt = new Date(Date.now() + 60_000);
		expect(await repository.reservePausedGroup(parentThreadId, agentId, ids, timeoutAt, 5)).toBe(
			'limit-reached',
		);
		expect((await repository.findById(ids[0]))?.status).toBe('paused');
		for (const job of active) await repository.settleIfActive(job.id, { status: 'completed' });
		const reservations = await Promise.all(
			[0, 1].map(
				async () => await repository.reservePausedGroup(parentThreadId, agentId, ids, timeoutAt, 5),
			),
		);
		expect(reservations.sort()).toEqual(['changed', 'reserved']);
		expect(await repository.countActiveSubAgentsByParentThread(parentThreadId)).toBe(5);
		expect(await repository.insertSubAgentJobIfCapacity({ ...jobs[0], id: uuid() }, 5)).toBe(false);
		expect(await repository.resumeIfPaused(ids[0], agentId, 'running', timeoutAt, timeoutAt)).toBe(
			true,
		);
		for (let index = 0; index < ids.length; index++) {
			expect(await repository.releasePausedResume(ids[index], agentId, timeoutAt)).toBe(
				index !== 0,
			);
		}
		expect(await repository.findById(ids[1])).toMatchObject({
			status: 'paused',
			result: 'Saved progress',
			notifiedAt: paused[1].notifiedAt,
			timeoutAt: null,
		});
		expect(await repository.countActiveSubAgentsByParentThread(parentThreadId)).toBe(1);
		expect(
			await repository.reservePausedGroup(parentThreadId, agentId, ids.slice(1), timeoutAt, 5),
		).toBe('reserved');
		await repository.requestPause(agentId, parentThreadId, 'draft-chat:user-1', uuidv7());
		expect(await repository.resumeIfPaused(ids[1], agentId, 'running', timeoutAt, timeoutAt)).toBe(
			false,
		);
		expect(await repository.releasePausedResume(ids[1], agentId, timeoutAt)).toBe(false);
	});

	it('replaces a paused group after settlement and clears expired saved work', async () => {
		const checkpoints = Container.get(AgentCheckpointRepository);
		const parentThreadId = uuid();
		const olderId = uuidv7({ msecs: Date.now() - 1000 });
		const newerId = uuidv7();
		const oldJobs = [uuid(), uuid()];
		const newJobId = uuid();
		const finishingId = uuid();
		const runIds = new Map<string, string>();
		for (const id of [...oldJobs, newJobId]) {
			const childThreadId = uuid();
			const runId = uuid();
			runIds.set(id, runId);
			await insertJob({
				id,
				parentThreadId,
				subAgentId: agentId,
				childThreadId,
				status: 'paused',
				pauseRequestId: id === newJobId ? newerId : olderId,
				result: 'Saved progress',
				notifiedAt: id === oldJobs[0] ? new Date() : null,
			});
			await checkpoints.insert({
				runId,
				agentId,
				threadId: childThreadId,
				state: JSON.stringify({ status: 'suspended', pendingToolCalls: {} }),
			});
		}
		await insertJob({
			id: finishingId,
			parentThreadId,
			status: 'running',
			pauseRequestId: newerId,
			settledAt: null,
		});
		const foreignId = uuid();
		await insertJob({
			id: foreignId,
			parentThreadId,
			parentResourceId: 'draft-chat:other',
			status: 'paused',
			pauseRequestId: olderId,
		});
		expect(
			await repository.retainLatestPausedGroup(
				agentId,
				parentThreadId,
				'draft-chat:user-1',
				REPLACED_PAUSE_GROUP_NOTICE,
			),
		).toEqual([]);
		expect((await repository.findById(oldJobs[0]))?.status).toBe('paused');
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const checkpointTtlSeconds = Container.get(AgentsConfig).checkpointTtlSeconds;
		const service = new AgentBackgroundJobService(
			repository,
			mock<AgentExecutionRepository>(),
			mock<ExecutionPersistence>(),
			mock<Publisher>(),
			logger,
			mock<AgentsConfig>({ backgroundTasksEnabled: false, checkpointTtlSeconds }),
			mock<AgentExecutionUpdateBroadcaster>(),
			Container.get(N8NCheckpointStorage),
			mock<AgentMessageRepository>(),
		);
		await service.settle(finishingId, { status: 'completed', result: 'Done' });
		for (const id of oldJobs) {
			expect(await repository.findById(id)).toMatchObject({
				status: 'cancelled',
				error: REPLACED_PAUSE_GROUP_NOTICE,
				notifiedAt: expect.any(Date),
			});
			expect(await checkpoints.findByRunId(runIds.get(id)!)).toMatchObject({
				expired: true,
				state: null,
			});
		}
		expect((await repository.findById(foreignId))?.status).toBe('paused');
		expect(await repository.findById(newJobId)).toMatchObject({
			status: 'paused',
			result: `Saved progress\n${REPLACED_PAUSE_GROUP_NOTICE}`,
		});
		await repository.markMailConsumed(parentThreadId, [newJobId, finishingId], true);
		const notifiedAt = (await repository.findById(newJobId))?.notifiedAt;
		await checkpoints.update(runIds.get(newJobId)!, {
			updatedAt: new Date(Date.now() - checkpointTtlSeconds * 1000 - 60_000),
		});
		await service.pruneExpiredPausedJobs(parentThreadId);
		expect(await repository.findById(newJobId)).toMatchObject({
			status: 'failed',
			error: EXPIRED_BACKGROUND_CHECKPOINT_ERROR,
			notifiedAt,
		});
		expect(await checkpoints.findByRunId(runIds.get(newJobId)!)).toMatchObject({
			expired: true,
			state: null,
		});
		expect(await repository.findRequestedPauses(parentThreadId)).toEqual([]);
	});

	it('finds expired paused tasks and preserves their report state during guarded cleanup', async () => {
		const checkpoints = Container.get(AgentCheckpointRepository);
		const pauseRequestId = uuid();
		const notifiedAt = new Date('2026-10-01T10:00:00Z');
		const cutoff = new Date('2026-10-01T00:00:00Z');
		const ids: string[] = [];
		for (const checkpoint of [
			undefined,
			{ expired: true, state: 'saved', updatedAt: new Date('2026-10-02T00:00:00Z') },
			{ expired: false, state: null, updatedAt: new Date('2026-10-02T00:00:00Z') },
			{ expired: false, state: 'saved', updatedAt: new Date('2026-09-30T00:00:00Z') },
			{ expired: false, state: 'saved', updatedAt: new Date('2026-10-02T00:00:00Z') },
		]) {
			const id = uuid();
			const childThreadId = uuid();
			ids.push(id);
			await insertJob({
				id,
				parentThreadId: 'parent',
				subAgentId: agentId,
				childThreadId,
				status: 'paused',
				pauseRequestId,
				notifiedAt,
			});
			if (checkpoint)
				await checkpoints.insert({
					runId: uuid(),
					agentId,
					threadId: childThreadId,
					...checkpoint,
				});
		}
		await insertJob({ id: uuid(), parentThreadId: 'other', status: 'paused' });
		expect(
			(await repository.findPausedWithoutCheckpoint(cutoff, 'parent')).map((job) => job.id).sort(),
		).toEqual(ids.slice(0, 4).sort());
		await repository.update(ids[0], { status: 'running' });
		await repository.update(ids[1], { pauseRequestId: uuid() });
		for (let index = 0; index < 3; index++) {
			expect(
				await repository.settleIfActive(
					ids[index],
					{ status: 'failed', error: 'Checkpoint expired' },
					{ status: 'paused', pauseRequestId },
				),
			).toBe(index === 2);
		}
		expect(await repository.findById(ids[2])).toMatchObject({ status: 'failed', notifiedAt });
	});

	it('returns only group fields for the selected agent and thread', async () => {
		const id = uuid();
		const createdAt = new Date('2026-09-01T10:00:00Z');
		const settledAt = new Date('2026-09-01T10:01:00Z');
		await insertJob({
			id,
			parentThreadId: 'thread-1',
			createdAt,
			settledAt,
			result: 'Stored result',
			error: 'Stored error',
		});
		const otherAgent = agentRepository.create(
			await agentRepository.findOneByOrFail({ id: agentId }),
		);
		otherAgent.id = uuid();
		await agentRepository.save(otherAgent);
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentAgentId: otherAgent.id });
		await insertJob({ id: uuid(), parentThreadId: 'thread-2' });

		const jobs = await repository.findGroupCandidates(agentId, 'thread-1');
		expect(jobs).toHaveLength(1);
		expect({ ...jobs[0] }).toEqual({
			id,
			kind: 'subagent',
			title: 'Research',
			status: 'completed',
			createdAt,
			settledAt,
			notifiedAt: null,
			pauseRequestId: null,
		});
	});

	it('orders wakeable rows of one thread and consumes only settled rows', async () => {
		const olderId = uuid();
		const newerId = uuid();
		const suspendedId = uuid();
		await insertJob({
			id: newerId,
			parentThreadId: 'thread-1',
			settledAt: new Date('2026-09-01T10:02:00Z'),
		});
		await insertJob({
			id: olderId,
			parentThreadId: 'thread-1',
			settledAt: new Date('2026-09-01T10:00:00Z'),
		});
		await insertJob({
			id: suspendedId,
			parentThreadId: 'thread-1',
			status: 'suspended',
			settledAt: null,
			updatedAt: new Date('2026-09-01T10:01:00Z'),
		});
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', notifiedAt: new Date() });
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', status: 'running', settledAt: null });
		await insertJob({ id: uuid(), parentThreadId: 'thread-2' });

		const pending = await repository.findWakeableUnconsumed('thread-1');
		const pendingIds = pending.map((job) => job.id);
		expect(pendingIds).toEqual([olderId, suspendedId, newerId]);

		await repository.markMailConsumed('thread-1', pendingIds);
		const remaining = await repository.findWakeableUnconsumed('thread-1');
		expect(remaining.map((job) => job.id)).toEqual([suspendedId]);
	});

	it('keeps one stop group until every selected job settles and the combined report is delivered', async () => {
		const first = uuid();
		const second = uuid();
		const workflow = uuid();
		const otherThread = uuid();
		const otherResource = uuid();
		const pauseRequestId = uuid();
		await insertJob({ id: first, parentThreadId: 'parent', status: 'running', settledAt: null });
		await insertJob({ id: second, parentThreadId: 'parent', status: 'suspended', settledAt: null });
		await insertJob({
			id: workflow,
			parentThreadId: 'parent',
			kind: 'workflow',
			status: 'running',
			settledAt: null,
		});
		await insertJob({
			id: otherThread,
			parentThreadId: 'other',
			kind: 'workflow',
			status: 'running',
			settledAt: null,
		});
		await insertJob({
			id: otherResource,
			parentThreadId: 'parent',
			parentResourceId: 'draft-chat:other',
			kind: 'workflow',
			status: 'running',
			settledAt: null,
		});
		await repository.requestPause(agentId, 'parent', 'draft-chat:user-1', pauseRequestId);
		await repository.requestPause(agentId, 'parent', 'draft-chat:user-1', uuid());
		expect(
			(await repository.findByParentThread('parent'))
				.filter((job) => job.pauseRequestId === pauseRequestId)
				.map((job) => job.id)
				.sort(),
		).toEqual([first, second, workflow].sort());
		expect((await repository.findById(otherResource))?.pauseRequestId).toBeNull();
		expect((await repository.findById(otherThread))?.pauseRequestId).toBeNull();
		expect(await repository.resumeIfSuspended(second, new Date())).toBe(false);
		expect(await repository.findById(second)).toMatchObject({
			status: 'suspended',
			pauseRequestId,
			timeoutAt: null,
		});

		const later = uuid();
		await insertJob({ id: later, parentThreadId: 'parent', status: 'suspended', settledAt: null });
		expect(await repository.resumeIfSuspended(later, new Date())).toBe(true);
		await repository.update(first, { status: 'paused', settledAt: new Date(), timeoutAt: null });
		expect(await repository.findWakeableUnconsumed('parent')).toEqual([]);
		await repository.settleIfActive(second, { status: 'completed', result: 'Won the race' });
		expect(await repository.settleIfActive(second, { status: 'cancelled' })).toBe(false);
		expect(await repository.findWakeableUnconsumed('parent')).toEqual([]);
		await repository.settleIfActive(workflow, { status: 'cancelled', result: 'Retained progress' });
		expect((await repository.findWakeableUnconsumed('parent')).map((job) => job.id).sort()).toEqual(
			[first, second, workflow].sort(),
		);
		expect(await repository.markMailConsumed('parent', [first, second, workflow])).toBe(0);
		expect(await repository.resumeIfPaused(first, pauseRequestId, 'running', new Date())).toBe(
			false,
		);
		expect(await repository.markMailConsumed('parent', [first, second, workflow], true)).toBe(3);
		expect(await repository.markMailConsumed('parent', [first, second, workflow], true)).toBe(0);
		expect(await repository.findWakeableUnconsumed('parent')).toEqual([]);
		expect(await repository.countActiveSubAgentsByParentThread('parent')).toBe(1);
		await repository.deleteSettledBefore(new Date(Date.now() + 60_000));
		expect((await repository.findById(first))?.status).toBe('paused');
		const deadline = new Date(Date.now() + 30 * 60_000);
		expect(await repository.resumeIfPaused(first, pauseRequestId, 'running', deadline)).toBe(true);
		expect(await repository.resumeIfPaused(first, pauseRequestId, 'running', deadline)).toBe(false);
		expect(await repository.findById(first)).toMatchObject({
			status: 'running',
			pauseRequestId: null,
			timeoutAt: deadline,
			settledAt: null,
			notifiedAt: null,
		});
	});

	it('reports a workflow-only stop group once and keeps completed outcomes', async () => {
		const cancelled = uuid();
		const completed = uuid();
		const pauseRequestId = uuidv7();
		for (const id of [cancelled, completed]) {
			await insertJob({
				id,
				parentThreadId: 'parent',
				kind: 'workflow',
				status: 'running',
				childThreadId: null,
				subAgentId: null,
				settledAt: null,
			});
		}
		await repository.requestPause(agentId, 'parent', 'draft-chat:user-1', pauseRequestId);
		expect(await repository.hasRequestedStop('parent', 'draft-chat:user-1')).toBe(true);
		await repository.settleIfActive(cancelled, { status: 'cancelled' });
		expect(await repository.findWakeableUnconsumed('parent')).toEqual([]);
		await repository.settleIfActive(completed, { status: 'completed', result: 'Done' });
		expect(await repository.settleIfActive(completed, { status: 'cancelled' })).toBe(false);
		expect((await repository.findWakeableUnconsumed('parent')).map((job) => job.id).sort()).toEqual(
			[cancelled, completed].sort(),
		);
		expect(await repository.markMailConsumed('parent', [cancelled, completed])).toBe(0);
		expect(await repository.hasRequestedStop('parent', 'draft-chat:user-1')).toBe(true);
		expect(await repository.markMailConsumed('parent', [cancelled, completed], true)).toBe(2);
		const delivered = await repository.findById(cancelled);
		await repository.requestPause(agentId, 'parent', 'draft-chat:user-1', uuidv7());
		expect(await repository.findById(cancelled)).toEqual(delivered);
		expect(await repository.findWakeableUnconsumed('parent')).toEqual([]);
		expect(await repository.hasRequestedStop('parent', 'draft-chat:user-1')).toBe(false);
		expect(await repository.hasRequestedStop('parent', 'draft-chat:other')).toBe(false);
		expect(await repository.hasRequestedStop('other', 'draft-chat:user-1')).toBe(false);
	});

	it.each([false, true])(
		'keeps the pause report delivery state when cancelling a paused job (delivered: %s)',
		async (delivered) => {
			const cancelledId = uuid();
			const remainingId = uuid();
			const pauseRequestId = uuid();
			for (const id of [cancelledId, remainingId]) {
				await insertJob({ id, parentThreadId: 'parent', status: 'paused', pauseRequestId });
			}
			if (delivered) {
				await repository.markMailConsumed('parent', [cancelledId, remainingId], true);
			}
			const notifiedAt = (await repository.findById(cancelledId))?.notifiedAt;

			expect(await repository.settleIfActive(cancelledId, { status: 'cancelled' })).toBe(true);
			expect(await repository.markMailConsumed('parent', [cancelledId])).toBe(0);
			expect(await repository.findById(cancelledId)).toMatchObject({
				status: 'cancelled',
				pauseRequestId,
				notifiedAt,
			});
			expect(
				(await repository.findWakeableUnconsumed('parent')).map((job) => job.id).sort(),
			).toEqual(delivered ? [] : [cancelledId, remainingId].sort());
			expect(
				await repository.resumeIfPaused(remainingId, pauseRequestId, 'running', new Date()),
			).toBe(delivered);
		},
	);

	it('consumes only selected settled rows from the requested thread', async () => {
		const selectedId = uuid();
		const otherId = uuid();
		const runningId = uuid();
		await insertJob({ id: selectedId, parentThreadId: 'thread-1' });
		await insertJob({ id: otherId, parentThreadId: 'thread-1' });
		await insertJob({
			id: runningId,
			parentThreadId: 'thread-1',
			status: 'running',
			settledAt: null,
		});

		const foreignId = uuid();
		await insertJob({ id: foreignId, parentThreadId: 'thread-2' });

		await expect(repository.markMailConsumed('thread-1', [])).resolves.toBe(0);
		await expect(
			repository.markMailConsumed('thread-1', [selectedId, runningId, foreignId]),
		).resolves.toBe(1);

		const selected = await repository.findById(selectedId);
		const other = await repository.findById(otherId);
		const running = await repository.findById(runningId);
		const foreign = await repository.findById(foreignId);
		expect(selected?.notifiedAt).toBeInstanceOf(Date);
		expect(other?.notifiedAt).toBeNull();
		expect(running?.notifiedAt).toBeNull();
		expect(foreign?.notifiedAt).toBeNull();
	});

	it('pauses only after checkpoint persistence and execution finalization', async () => {
		const checkpoints = Container.get(AgentCheckpointRepository);
		const checkpointStorage = Container.get(N8NCheckpointStorage);
		const threads = Container.get(AgentExecutionThreadRepository);
		const childThreadId = uuid();
		const runId = uuid();
		const id = uuid();
		const executionId = uuid();
		const agent = await agentRepository.findOneByOrFail({ id: agentId });
		await threads.insert({
			id: childThreadId,
			projectId: agent.projectId,
			agentId,
			agentName: agent.name,
		});
		await repository.manager.insert(AgentExecution, {
			id: executionId,
			threadId: childThreadId,
			status: 'running',
		});
		await insertJob({
			id,
			parentThreadId: 'parent',
			subAgentId: agentId,
			childThreadId,
			status: 'running',
			pauseRequestId: uuid(),
			settledAt: null,
		});
		const job = await repository.findOneByOrFail({ id });
		const checkpoint: SerializableAgentState = {
			status: 'suspended',
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			persistence: {
				threadId: childThreadId,
				resourceId: 'draft-chat:user-1',
				delegated: true,
			},
			pendingToolCalls: {
				approval: {
					toolCallId: 'approval',
					toolName: 'approve_action',
					input: { id: 'item-1' },
					suspended: true,
					suspendPayload: {
						type: 'approval',
						toolName: 'approve_action',
						args: { id: 'item-1' },
					},
					resumeSchema: { type: 'object', properties: { approved: { type: 'boolean' } } },
					runId,
				},
			},
		};
		const original = JSON.stringify(checkpoint);
		const state = JSON.stringify({ ...checkpoint, finishReason: 'paused' });
		try {
			expect(await repository.pauseIfRequested(job, 'Progress', runId, state)).toBe(false);
			const updatedAt = new Date(Date.now() - 60_000);
			await checkpoints.insert({
				runId,
				agentId,
				threadId: childThreadId,
				state: original,
				updatedAt,
			});
			const suspension = { runId, checkpoint, serializedState: original, updatedAt };
			expect(await checkpointStorage.markUserPaused(uuid(), suspension)).toBe(false);
			expect(
				await checkpointStorage.markUserPaused(agentId, {
					...suspension,
					updatedAt: new Date(updatedAt.getTime() - 1),
				}),
			).toBe(false);
			expect(await checkpoints.findByRunId(runId)).toMatchObject({
				agentId,
				state: original,
				updatedAt,
			});
			expect(await checkpointStorage.markUserPaused(agentId, suspension)).toBe(true);
			expect(await checkpointStorage.markUserPaused(agentId, suspension)).toBe(false);
			expect(await checkpoints.findByRunId(runId)).toMatchObject({
				agentId,
				state,
				updatedAt,
			});
			expect(await repository.pauseIfRequested(job, 'Progress', runId, state)).toBe(false);
			await repository.manager.update(AgentExecution, executionId, { status: 'success' });
			expect(await repository.pauseIfRequested(job, 'Progress', runId, original)).toBe(false);
			expect(await repository.pauseIfRequested(job, 'Progress', runId, state)).toBe(true);
			expect(await repository.settleIfActive(id, { status: 'failed' }, { status: 'running' })).toBe(
				false,
			);
			expect(await repository.findById(id)).toMatchObject({
				status: 'paused',
				timeoutAt: null,
				result: 'Progress',
			});
			expect(await repository.findSettledSubAgentsWithCheckpoints()).toEqual([]);
		} finally {
			await checkpoints.delete(runId);
			await threads.delete(childThreadId);
		}
	});

	it('deletes old settled jobs only if their results are marked as delivered', async () => {
		const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
		const consumedId = uuid();
		const pendingId = uuid();
		const recentId = uuid();
		await insertJob({
			id: consumedId,
			parentThreadId: 'thread-1',
			settledAt: old,
			notifiedAt: old,
		});
		await insertJob({ id: pendingId, parentThreadId: 'thread-1', settledAt: old });
		await insertJob({ id: recentId, parentThreadId: 'thread-1', notifiedAt: new Date() });

		await repository.deleteSettledBefore(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

		expect(await repository.findById(consumedId)).toBeNull();
		expect(await repository.findById(pendingId)).not.toBeNull();
		expect(await repository.findById(recentId)).not.toBeNull();
	});

	it('returns each thread with unconsumed mail once and accepts a 255-character resource id', async () => {
		const resourceId = 'r'.repeat(255);
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-2', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'consumed-thread', notifiedAt: new Date() });

		const threadIds = await repository.findThreadsWithUnconsumedMail();
		expect(threadIds.sort()).toEqual(['thread-1', 'thread-2']);
		const [job] = await repository.findWakeableUnconsumed('thread-1');
		expect(job?.parentResourceId).toHaveLength(255);
	});

	it('settles a job, delays its wake, retries delivery, and marks the result as delivered', async () => {
		vi.useFakeTimers();
		try {
			const jobId = uuid();
			// The owner role grants the agent:execute permission required for a wake.
			const user = await createOwner();
			const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: user.id });
			await insertJob({
				id: jobId,
				parentThreadId: 'thread-1',
				status: 'running',
				settledAt: null,
				parentResourceId: `draft-chat:${user.id}`,
				parentPrincipalHash: principalHash,
			});

			const executionRepository = mock<AgentExecutionRepository>();
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			const checkpointStorage = mock<N8NCheckpointStorage>();
			checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
			const orchestrator = mock<AgentExecutionOrchestratorService>();
			let firstWakeStarted!: () => void;
			const firstWake = new Promise<void>((resolve) => (firstWakeStarted = resolve));
			orchestrator.executeForWake.mockImplementationOnce(async () => {
				firstWakeStarted();
				throw new Error('model unavailable');
			});
			const lockService = Container.get(LockService);
			const publisher = mock<Publisher>();
			const agentsConfig = mock<AgentsConfig>({ backgroundTasksEnabled: true });
			const logger = mock<Logger>();
			logger.scoped.mockReturnValue(logger);
			const userRepository = mock<UserRepository>();
			userRepository.findByIdWithRole.mockResolvedValue(user);
			const markMailConsumed = repository.markMailConsumed.bind(repository);
			let mailConsumed!: () => void;
			const consumed = new Promise<void>((resolve) => (mailConsumed = resolve));
			vi.spyOn(repository, 'markMailConsumed').mockImplementation(async (...args) => {
				const affected = await markMailConsumed(...args);
				mailConsumed();
				return affected;
			});
			const jobService = new AgentBackgroundJobService(
				repository,
				executionRepository,
				mock<ExecutionPersistence>(),
				publisher,
				logger,
				agentsConfig,
				mock<AgentExecutionUpdateBroadcaster>(),
				checkpointStorage,
				mock<AgentMessageRepository>(),
			);
			const wakeService = new AgentWakeService(
				repository,
				new AgentConversationStateService(executionRepository, checkpointStorage),
				agentRepository,
				userRepository,
				mock<ChatIntegrationRegistry>(),
				orchestrator,
				lockService,
				publisher,
				mock<InstanceSettings>({ isWorker: false }),
				agentsConfig,
				logger,
				jobService,
			);
			Container.set(AgentWakeService, wakeService);

			await jobService.settle(jobId, { status: 'completed', result: 'Done' });
			await vi.advanceTimersByTimeAsync(WAKE_DEBOUNCE_MS);
			await firstWake;
			expect((await repository.findById(jobId))?.notifiedAt).toBeNull();

			let secondWakeStarted!: () => void;
			const secondWake = new Promise<void>((resolve) => (secondWakeStarted = resolve));
			orchestrator.executeForWake.mockImplementationOnce(async () => secondWakeStarted());
			await wakeService.requestWake('thread-1');
			await vi.advanceTimersByTimeAsync(WAKE_DEBOUNCE_MS);
			await secondWake;
			await consumed;

			expect(orchestrator.executeForWake).toHaveBeenCalledTimes(2);
			expect((await repository.findById(jobId))?.notifiedAt).toBeInstanceOf(Date);
		} finally {
			vi.restoreAllMocks();
			vi.useRealTimers();
		}
	});
});
