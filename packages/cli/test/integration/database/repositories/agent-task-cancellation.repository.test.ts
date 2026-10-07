import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentCheckpoint } from '@/modules/agents/entities/agent-checkpoint.entity';
import { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';
import { AgentBackgroundJob } from '@/modules/agents/entities/agent-background-job.entity';
import { AgentTaskCancellation } from '@/modules/agents/entities/agent-task-cancellation.entity';
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

	async function request(
		status: AgentTaskCancellation['status'] = 'stopping',
		planId: string | null = null,
	) {
		return await repository.saveRequest(
			Object.assign(new AgentTaskCancellation(), {
				id: randomUUID(),
				generation: await repository.captureGeneration(thread.id, {}),
				threadId: thread.id,
				planId,
				cutoffAt,
				status,
				failures: [],
				reportStatus: 'pending',
				report: '',
				settledAt: status === 'stopped' ? afterStop : null,
			}),
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

	it('keeps holds across fresh reads and releases only the selected message', async () => {
		const first = await enqueue('First');
		const second = await enqueue('Second');
		await queue.holdPending(thread.id, {});
		const third = await enqueue('New request');
		expect((await queue.listPending(thread.id)).map(({ held }) => held)).toEqual([
			true,
			true,
			false,
		]);
		expect((await queue.findHead(thread.id, {}))?.id).toBe(third.id);
		expect(await queue.reserveSteering(thread.id, first.id, randomUUID(), {})).toBe(false);
		await queue.releaseHeld(thread.id, second.id, {});
		expect((await queue.findHead(thread.id, {}))?.id).toBe(second.id);
		expect((await queue.findItem(thread.id, first.id, {}))?.held).toBe(true);
	});

	it('blocks old executions after cancellation and permits new work', async () => {
		const old = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'success', createdAt: beforeStop });
		const cancellation = await request();
		const newer = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'running', createdAt: afterStop });
		expect(await repository.isCancelled(thread.id, newer.id)).toBe(true);
		await repository.saveRequest({ ...cancellation, status: 'stopped' }, {});
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
		await request('stopped');
		expect(await repository.isCancelled(thread.id, execution.id)).toBe(true);
	});

	it('blocks a child admitted before cancellation even if its thread starts later', async () => {
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
		await request('stopped');
		expect(await repository.isCancelled(child.id)).toBe(true);
	});

	it('waits for a descendant checkpoint saved during cancellation cleanup', async () => {
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
		expect(await repository.hasRunningWork(cancellation, {})).toBe(true);
		await db.getRepository(AgentCheckpoint).update({ runId }, { state: null });
		expect(await repository.hasRunningWork(cancellation, {})).toBe(false);
	});

	it('rejects dispatch while cancellation owns the conversation', async () => {
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
		const cancellation = await request('stopped');
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
		expect((await repository.latest(thread.id))?.status).toBe('stopping');
		expect((await repository.targetedJobs(cancellation)).map((job) => job.id)).toContain(id);
	});

	it('commits the closed plan and its final history revision with cancellation', async () => {
		const plan = await plans.createActivePlan(
			{ id: randomUUID(), threadId: thread.id, formatVersion: 1, data: { result: 'Saved' } },
			{},
		);
		const cancellation = await request('stopping', plan.id);
		await expect(
			plans.replacePlan(
				{ threadId: thread.id, planId: plan.id, expectedRevision: 1, formatVersion: 1, data: {} },
				{},
			),
		).rejects.toThrow('These tasks were canceled');
		await Container.get(TransactionRunner).run({}, async (ctx) => {
			await plans.cancelPlan(
				{
					threadId: thread.id,
					planId: plan.id,
					expectedRevision: 1,
					formatVersion: 1,
					data: { result: 'Saved', canceled: true },
				},
				ctx,
			);
			await repository.saveRequest({ ...cancellation, status: 'stopped' }, ctx);
		});
		const current = await plans.findPlan(thread.id, plan.id, {});
		const history = await plans.findRevision(thread.id, plan.id, 2, {});
		expect(current?.closedAt).toBeInstanceOf(Date);
		expect(history).toMatchObject({
			data: current?.data,
			closedAt: current?.closedAt,
			revision: 2,
		});
		expect((await plans.findRevision(thread.id, plan.id, 1, {}))?.data).toEqual({
			result: 'Saved',
		});
	});

	it('rejects an old automatic wake at admission and permits only the claimed cancellation report', async () => {
		const job = await db.getRepository(AgentBackgroundJob).save({
			id: randomUUID(),
			parentThreadId: thread.id,
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:test',
			parentPrincipalHash: 'principal',
			title: 'Completed task',
			kind: 'subagent',
			status: 'completed',
			createdAt: beforeStop,
		});
		const cancellation = await request('stopped');
		await expect(
			repository.assertWakeAdmission(thread.id, { jobIds: [job.id] }, {}),
		).rejects.toThrow('These background tasks were canceled');
		await repository.claimReport(cancellation.id);
		await expect(
			repository.assertWakeAdmission(
				thread.id,
				{ jobIds: [], cancellationId: cancellation.id },
				{},
			),
		).resolves.toBeUndefined();
		await expect(repository.assertWakeAdmission(thread.id, { jobIds: [] }, {})).rejects.toThrow(
			'These background tasks were canceled',
		);
	});

	it('claims one acknowledgement and leaves its saved fallback after a restart', async () => {
		const cancellation = await request('stopped');
		const claims = await Promise.all([
			repository.claimReport(cancellation.id),
			repository.claimReport(cancellation.id),
		]);
		expect(claims.filter(Boolean)).toHaveLength(1);
		expect((await repository.findRequest(thread.id, cancellation.id))?.reportStatus).toBe(
			'claimed',
		);
		expect(await repository.claimReport(cancellation.id)).toBe(false);
	});
});
