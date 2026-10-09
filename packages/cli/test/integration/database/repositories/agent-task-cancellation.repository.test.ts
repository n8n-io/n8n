import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentCheckpoint } from '@/modules/agents/entities/agent-checkpoint.entity';
import { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';
import { AgentBackgroundJob } from '@/modules/agents/entities/agent-background-job.entity';
import { AgentTaskCancellationRepository } from '@/modules/agents/repositories/agent-task-cancellation.repository';
import { AgentMessageQueueRepository } from '@/modules/agents/repositories/agent-message-queue.repository';
import { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';
import { AgentPlanRepository } from '@/modules/agents/repositories/agent-plan.repository';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';

const beforeStop = new Date('2026-10-01T10:00:00.000Z');
const cutoffAt = new Date('2026-10-01T10:01:00.000Z');
const afterStop = new Date('2026-10-01T10:02:00.000Z');

describe('Task cancellation persistence', () => {
	let db: DataSource;
	let repository: AgentTaskCancellationRepository;
	let queue: AgentMessageQueueRepository;
	let plans: AgentPlanRepository;
	let thread: AgentExecutionThread;
	let agentId: string;
	let projectId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		db = Container.get(DataSource);
		repository = Container.get(AgentTaskCancellationRepository);
		queue = Container.get(AgentMessageQueueRepository);
		plans = Container.get(AgentPlanRepository);
		({ id: projectId } = await createTeamProject());
		agentId = randomUUID();
		await db.getRepository(Agent).save({
			id: agentId,
			name: 'Cancellation tests',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
		});
	});

	beforeEach(async () => {
		thread = await db.getRepository(AgentExecutionThread).save({
			id: randomUUID(),
			agentId,
			agentName: 'Cancellation tests',
			projectId,
			sessionNumber: 1,
			createdAt: beforeStop,
		});
	});
	afterAll(async () => await testDb.terminate());

	async function request(planId: string | null = null) {
		return await repository.saveStop(
			{
				threadId: thread.id,
				planId,
				requestedAt: cutoffAt.toISOString(),
				generation: await repository.captureGeneration(thread.id, {}),
				failures: [],
				pause: { id: randomUUID() },
			},
			{},
		);
	}

	async function enqueue(message: string) {
		const input = await Container.get(AgentMessageRepository).createInput(
			{
				threadId: thread.id,
				resourceId: 'draft-chat:test',
				content: { role: 'user', content: [{ type: 'text', text: message }] },
				origin: { source: 'chat' },
			},
			{},
		);
		return await queue.enqueue(thread.id, input.id, { kind: 'preview' }, {});
	}

	it('discards pending and steering messages while preserving later input', async () => {
		const first = await enqueue('First');
		await enqueue('Second');
		const execution = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'running' });
		await queue.reserveSteering(thread.id, first.id, execution.id, {});
		await queue.discardPending(thread.id, {});
		expect(await queue.listPending(thread.id)).toEqual([]);
		const next = await enqueue('Continue');
		expect((await queue.findHead(thread.id, {}))?.id).toBe(next.id);
	});

	it('admits one stop report and waits for it before admitting new plan work', async () => {
		const old = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'cancelled' });
		const stop = await request();
		const report = { jobIds: [], planStopId: stop.pause.id };
		expect(await repository.pendingPauseReports()).toContain(thread.id);
		expect(await repository.blocksQueue(thread.id, {})).toBe(true);
		await expect(repository.assertWakeAdmission(thread.id, { jobIds: [] }, {})).rejects.toThrow(
			'The plan is stopped',
		);
		await expect(repository.assertWakeAdmission(thread.id, report, {})).resolves.toBeUndefined();
		const execution = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'running' });
		await repository.recordAdmission(
			thread.id,
			execution.id,
			{ planStopId: stop.pause.id, userInitiated: false },
			{},
		);
		await expect(repository.assertWakeAdmission(thread.id, report, {})).rejects.toThrow(
			'no longer available',
		);
		await repository.finishPauseReport(thread.id, stop.pause.id);
		expect(await repository.blocksQueue(thread.id, {})).toBe(true);
		await db.getRepository(AgentExecution).update(execution.id, { status: 'success' });
		await repository.finishPauseReport(thread.id, stop.pause.id);
		expect(await repository.blocksQueue(thread.id, {})).toBe(false);
		expect(await repository.pendingPauseReports()).not.toContain(thread.id);
		await repository.recordAdmission(thread.id, randomUUID(), { userInitiated: true }, {});
		expect((await repository.latest(thread.id))?.pause.resumedAt).toBeDefined();
		expect(await repository.isCancelled(thread.id, old.id)).toBe(true);
		await expect(
			repository.assertWakeAdmission(thread.id, { jobIds: [] }, {}),
		).resolves.toBeUndefined();
	});

	it('keeps a stopped child checkpoint and blocks dispatch until Continue', async () => {
		const child = await db.getRepository(AgentExecutionThread).save({
			id: randomUUID(),
			agentId,
			agentName: 'Child',
			projectId,
			parentThreadId: thread.id,
			sessionNumber: 2,
		});
		const job = await db.getRepository(AgentBackgroundJob).save({
			id: randomUUID(),
			parentThreadId: thread.id,
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:test',
			parentPrincipalHash: 'principal',
			title: 'Child',
			kind: 'subagent',
			status: 'paused',
			childThreadId: child.id,
		});
		const stop = await request();
		await db
			.getRepository(AgentCheckpoint)
			.save({ runId: randomUUID(), agentId, threadId: child.id, state: '{}', expired: false });
		expect(await repository.unfinishedWork(stop)).toEqual([]);
		expect(await repository.isCancelled(child.id)).toBe(false);
		expect(await repository.hasPausedAncestor(child.id, {})).toBe(true);
		await expect(repository.assertAdmission(child.id, undefined, {})).rejects.toThrow();
		await repository.finishPauseReport(thread.id, stop.pause.id, true);
		await expect(
			repository.assertWakeAdmission(thread.id, { jobIds: [], planStopId: stop.pause.id }, {}),
		).rejects.toThrow('no longer available');
		expect((await repository.latest(thread.id))?.pause).toMatchObject({
			reportFailed: true,
			reportedAt: expect.any(String),
		});
		expect(
			(await db.getRepository(AgentBackgroundJob).findOneByOrFail({ id: job.id })).notifiedAt,
		).not.toBeNull();
		await repository.recordAdmission(thread.id, randomUUID(), { userInitiated: true }, {});
		expect(await repository.hasPausedAncestor(child.id, {})).toBe(false);
		await expect(repository.assertAdmission(child.id, undefined, {})).resolves.toBeUndefined();
	});

	it('stores only the latest stop boundary on its chat', async () => {
		const original = await request();
		const other = await db.getRepository(AgentExecutionThread).save({
			id: randomUUID(),
			agentId,
			agentName: 'Other chat',
			projectId,
			sessionNumber: 2,
		});
		expect(
			(await db.getRepository(AgentExecutionThread).findOneByOrFail({ id: thread.id })).taskStop,
		).toMatchObject({ requestedAt: original.requestedAt });
		expect(await repository.latest(other.id)).toBeNull();
		const execution = await db.getRepository(AgentExecution).save({
			id: randomUUID(),
			threadId: thread.id,
			status: 'success',
		});
		await request();
		expect((await repository.latest(thread.id))?.generation.executionIds).toContain(execution.id);
		const runner = db.createQueryRunner();
		try {
			expect(await runner.hasTable('agent_task_cancellation')).toBe(false);
		} finally {
			await runner.release();
		}
	});

	it('blocks old executions after cancellation and permits new work', async () => {
		const old = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'success', createdAt: beforeStop });
		await request();
		const newer = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'running', createdAt: afterStop });
		expect(await repository.isCancelled(thread.id, old.id)).toBe(true);
		expect(await repository.isCancelled(thread.id, newer.id)).toBe(false);
	});

	it('uses captured identities when another server has a later clock', async () => {
		const execution = await db.getRepository(AgentExecution).save({
			id: randomUUID(),
			threadId: thread.id,
			status: 'success',
			createdAt: afterStop,
		});
		await request();
		expect(await repository.isCancelled(thread.id, execution.id)).toBe(true);
	});

	it('permits work admitted after cancellation even when its timestamp is earlier', async () => {
		const cancellation = await request();
		const execution = await db.getRepository(AgentExecution).save({
			id: randomUUID(),
			threadId: thread.id,
			status: 'running',
			createdAt: beforeStop,
		});
		expect(await repository.isCancelled(thread.id, execution.id)).toBe(false);
		const job = await db.getRepository(AgentBackgroundJob).save({
			id: randomUUID(),
			parentThreadId: thread.id,
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:test',
			parentPrincipalHash: 'principal',
			title: 'New work',
			kind: 'subagent',
			status: 'running',
			sourceExecutionId: execution.id,
			createdAt: beforeStop,
		});
		expect((await repository.targetedJobs(cancellation)).map((item) => item.id)).not.toContain(
			job.id,
		);
	});

	it('does not include descendants from a later user request', async () => {
		const stop = await request();
		const child = await db.getRepository(AgentExecutionThread).save({
			id: randomUUID(),
			agentId,
			agentName: 'New child',
			projectId,
			parentThreadId: thread.id,
			sessionNumber: 2,
		});
		await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: child.id, status: 'running' });
		expect(await repository.targetedDescendants(stop)).toEqual([]);
		expect(await repository.unfinishedWork(stop)).toEqual([]);
		expect(await repository.isCancelled(child.id)).toBe(false);
	});

	it('waits for a live foreground checkpoint to stop', async () => {
		const execution = await db.getRepository(AgentExecution).save({
			id: randomUUID(),
			threadId: thread.id,
			status: 'success',
			hitlStatus: 'suspended',
		});
		const stop = await request();
		const runId = randomUUID();
		await db.getRepository(AgentCheckpoint).save({
			runId,
			agentId,
			threadId: thread.id,
			expired: false,
			state: JSON.stringify({
				status: 'suspended',
				persistence: {
					threadId: thread.id,
					hostMetadata: { n8nExecutionId: execution.id },
				},
			}),
		});
		expect(await repository.unfinishedWork(stop)).toEqual([
			{ jobId: execution.id, title: 'Current response' },
		]);
		await db
			.getRepository(AgentCheckpoint)
			.update({ runId }, { updatedAt: new Date('2000-01-01') });
		expect(await repository.unfinishedWork(stop)).toEqual([]);
		await db.getRepository(AgentCheckpoint).update({ runId }, { updatedAt: new Date() });
		await db.getRepository(AgentCheckpoint).update({ runId }, { state: null, expired: true });
		expect(await repository.unfinishedWork(stop)).toEqual([]);
	});

	it('pauses a child admitted before Stop even if its thread starts later', async () => {
		const child = await db.getRepository(AgentExecutionThread).save({
			id: randomUUID(),
			agentId,
			agentName: 'Child',
			projectId,
			sessionNumber: 2,
			parentThreadId: thread.id,
			createdAt: afterStop,
		});
		await db.getRepository(AgentBackgroundJob).save({
			id: randomUUID(),
			parentThreadId: thread.id,
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:test',
			parentPrincipalHash: 'principal',
			title: 'Child',
			kind: 'subagent',
			status: 'cancelled',
			childThreadId: child.id,
			createdAt: beforeStop,
		});
		await request();
		expect(await repository.hasPausedAncestor(child.id, {})).toBe(true);
	});

	it('preserves a descendant checkpoint saved while stopping', async () => {
		const child = await db.getRepository(AgentExecutionThread).save({
			id: randomUUID(),
			agentId,
			agentName: 'Child',
			projectId,
			sessionNumber: 2,
			parentThreadId: thread.id,
			createdAt: beforeStop,
		});
		const cancellation = await request();
		const runId = randomUUID();
		await db
			.getRepository(AgentCheckpoint)
			.save({ runId, agentId, threadId: child.id, state: '{}', expired: false });
		expect(await repository.unfinishedWork(cancellation, {})).toEqual([]);
		expect(await db.getRepository(AgentCheckpoint).findOneBy({ runId })).not.toBeNull();
		await db.getRepository(AgentCheckpoint).update({ runId }, { state: null });
		expect(await repository.unfinishedWork(cancellation, {})).toEqual([]);
	});

	it('rejects dispatch from a canceled execution', async () => {
		const source = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'running' });
		await request();
		await expect(
			Container.get(AgentBackgroundJobRepository).insertSubAgentJobIfCapacity(
				{
					id: randomUUID(),
					kind: 'subagent',
					parentThreadId: thread.id,
					parentAgentId: agentId,
					parentResourceId: 'draft-chat:test',
					parentPrincipalHash: 'principal',
					title: 'Late task',
					sourceExecutionId: source.id,
					subAgentId: agentId,
					childThreadId: randomUUID(),
					timeoutAt: afterStop,
				},
				5,
			),
		).rejects.toThrow('These tasks were canceled');
	});

	it('tracks a workflow that reaches Wait after cancellation so stopping can retry', async () => {
		const source = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'success', createdAt: beforeStop });
		const cancellation = await request();
		const id = randomUUID();
		await Container.get(AgentBackgroundJobRepository).insertWorkflowJobOrGetExisting({
			id,
			kind: 'workflow',
			parentThreadId: thread.id,
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:test',
			parentPrincipalHash: 'principal',
			title: 'Waiting workflow',
			workflowId: 'workflow',
			childExecutionId: '123',
			sourceExecutionId: source.id,
		});
		expect(await repository.latest(thread.id)).toEqual(cancellation);
		expect((await repository.targetedJobs(cancellation)).map((job) => job.id)).toContain(id);
	});

	it('keeps plan history and blocks late writes after Stop', async () => {
		await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'running' });
		const plan = await plans.createActivePlan(
			{ id: randomUUID(), threadId: thread.id, formatVersion: 1, data: { result: 'Saved' } },
			{},
		);
		await request(plan.id);
		await expect(
			plans.replacePlan(
				{ threadId: thread.id, planId: plan.id, expectedRevision: 1, formatVersion: 1, data: {} },
				{},
			),
		).rejects.toThrow('These tasks were canceled');
		const current = await plans.findPlan(thread.id, plan.id, {});
		expect(current).toMatchObject({ closedAt: null, revision: 1, data: { result: 'Saved' } });
		expect((await plans.findRevision(thread.id, plan.id, 1, {}))?.data).toEqual({
			result: 'Saved',
		});
		expect(await plans.findRevision(thread.id, plan.id, 2, {})).toBeNull();
	});

	it('blocks an old wake even if the job finished before Stop', async () => {
		const job = await db.getRepository(AgentBackgroundJob).save({
			id: randomUUID(),
			parentThreadId: thread.id,
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:test',
			parentPrincipalHash: 'principal',
			title: 'Completed task',
			kind: 'subagent',
			status: 'completed',
			result: 'Saved output',
		});
		const stop = await request();
		await repository.finishPauseReport(thread.id, stop.pause.id, true);
		await expect(
			repository.assertWakeAdmission(thread.id, { jobIds: [job.id] }, {}),
		).rejects.toThrow('The plan is stopped');
		await expect(repository.assertWakeAdmission(thread.id, { jobIds: [] }, {})).rejects.toThrow(
			'The plan is stopped',
		);
		expect(
			await db.getRepository(AgentBackgroundJob).findOneByOrFail({ id: job.id }),
		).toMatchObject({ result: 'Saved output', notifiedAt: expect.any(Date) });
	});
});
