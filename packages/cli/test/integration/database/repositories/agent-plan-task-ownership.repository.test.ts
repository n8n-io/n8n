import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';

import { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentBackgroundJob } from '@/modules/agents/entities/agent-background-job.entity';
import { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentPlan } from '@/modules/agents/entities/agent-plan.entity';
import { AgentPlanService } from '@/modules/agents/agent-plan.service';
import {
	parseStoredAgentPlan,
	type AgentPlanDocument,
	type AgentPlanTask,
} from '@/modules/agents/plans/agent-plan.schema';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import { AgentPlanRepository } from '@/modules/agents/repositories/agent-plan.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';

const task = (title: string): AgentPlanTask => ({
	id: randomUUID(),
	kind: 'task',
	title,
	description: title,
	status: 'pending',
	dependsOn: [],
	startedAt: null,
	endedAt: null,
});

describe('Plan task ownership and continuation', () => {
	let db: DataSource;
	let plans: AgentPlanRepository;
	let jobs: AgentBackgroundJobRepository;
	let stops: AgentExecutionThreadRepository;
	let thread: AgentExecutionThread;
	let agentId: string;
	let projectId: string;
	let planId: string;
	let tasks: AgentPlanTask[];

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();

		db = Container.get(DataSource);
		plans = Container.get(AgentPlanRepository);
		jobs = Container.get(AgentBackgroundJobRepository);
		stops = Container.get(AgentExecutionThreadRepository);

		({ id: projectId } = await createTeamProject());
		agentId = randomUUID();
		await db.getRepository(Agent).save({
			id: agentId,
			projectId,
			name: 'Plan tests',
			integrations: [],
			tools: {},
			skills: {},
		});
	});

	beforeEach(async () => {
		thread = await db
			.getRepository(AgentExecutionThread)
			.save({ id: randomUUID(), agentId, projectId, agentName: 'Plan tests' });

		tasks = [task('Help Scout'), task('Crisp'), task('Freshdesk')];
		planId = randomUUID();

		await Container.get(AgentPlanRepository).createActivePlan(
			{
				id: planId,
				threadId: thread.id,
				formatVersion: 2,
				data: { title: 'Research', description: 'Compare products', items: tasks },
			},
			{},
		);
	});

	afterAll(async () => await testDb.terminate());

	async function stop() {
		return await stops.saveStop(
			{
				threadId: thread.id,
				planId,
				requestedAt: new Date().toISOString(),
				generation: await stops.captureStopTargets(thread.id, {}),
				failures: [],
				pause: {
					id: uuidv7(),
					reportedAt: new Date().toISOString(),
					resumedAt: new Date().toISOString(),
				},
			},
			{},
		);
	}

	const service = () => Container.get(AgentPlanService);
	const ref = (index = 0) => ({ planId, planTaskId: tasks[index].id });
	const snapshot = async () => (await service().findPlan(thread.id, planId, {}))!;

	async function register(index = 0, parentThreadId = thread.id, inheritedPlanTask = false) {
		const id = randomUUID();

		await jobs.insertSubAgentJobIfCapacity(
			{
				id,
				kind: 'subagent',
				parentAgentId: agentId,
				parentThreadId,
				parentResourceId: 'draft-chat:test',
				parentPrincipalHash: 'principal',
				title: 'Research',
				subAgentId: agentId,
				childThreadId: randomUUID(),
				timeoutAt: new Date(Date.now() + 60000),
				planTask: ref(index),
				inheritedPlanTask,
				validatePlanTask: true,
			},
			10,
		);

		return (await jobs.findById(id))!;
	}

	async function edit(data: AgentPlanDocument) {
		const current = await snapshot();

		return await service().replacePlan(
			{ threadId: thread.id, planId, expectedRevision: current.revision, formatVersion: 2, data },
			{},
		);
	}

	it('requires a valid task in the current conversation', async () => {
		await expect(plans.validateTask(thread.id, undefined)).rejects.toThrow('pass planTask');
		await expect(plans.validateTask('foreign', ref())).rejects.toThrow('another conversation');
		await expect(
			plans.validateTask(thread.id, { planId: randomUUID(), planTaskId: tasks[0].id }),
		).rejects.toThrow('stale');
		await expect(
			plans.validateTask(thread.id, { planId, planTaskId: randomUUID() }),
		).rejects.toThrow('leaf task');
		await expect(plans.validateTask(thread.id, ref())).resolves.toBeUndefined();
	});

	it('stops the inherited owner lookup at a parent cycle', async () => {
		const threads = db.getRepository(AgentExecutionThread);
		const first = await threads.save({ id: randomUUID(), agentId, projectId, agentName: 'A' });
		const second = await threads.save({
			id: randomUUID(),
			parentThreadId: first.id,
			agentId,
			projectId,
			agentName: 'B',
		});
		await threads.update(first.id, { parentThreadId: second.id });

		await expect(plans.validateTask(first.id, ref(), {}, true)).rejects.toThrow(
			'another conversation',
		);
	});

	it('binds one job in the registration transaction and resolves changes without a new revision', async () => {
		const job = await register();
		const current = await snapshot();

		expect(current.revision).toBe(2);
		expect(current.data.items[0]).toMatchObject({ jobId: job.id, status: 'in_progress' });

		const stored = await Container.get(AgentPlanRepository).findPlan(thread.id, planId, {});

		expect(stored?.data.items).toContainEqual(expect.objectContaining({ jobId: job.id }));
		expect(parseStoredAgentPlan(stored!.data, 2).items[0]).not.toHaveProperty('status');

		await db
			.getRepository(AgentBackgroundJob)
			.update(job.id, { status: 'completed', settledAt: new Date() });

		expect(await snapshot()).toMatchObject({
			revision: 2,
			data: {
				items: [expect.objectContaining({ status: 'done' }), expect.anything(), expect.anything()],
			},
		});
		expect((await service().listHistory(thread.id, planId, {}, {})).items).toHaveLength(2);

		await expect(register()).rejects.toThrow('unfinished leaf');
		expect(await db.getRepository(AgentBackgroundJob).countBy({ planId })).toBe(1);
	});

	it('accepts only one concurrent owning job', async () => {
		const results = await Promise.allSettled([register(), register()]);

		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(await db.getRepository(AgentBackgroundJob).countBy({ planId })).toBe(1);
		expect((await snapshot()).revision).toBe(2);
	});

	it('rolls back the job if binding fails', async () => {
		const binding = vi.spyOn(plans, 'bindJob').mockRejectedValueOnce(new Error('Binding failed'));

		try {
			await expect(register()).rejects.toThrow('Binding failed');
		} finally {
			binding.mockRestore();
		}

		expect(await db.getRepository(AgentBackgroundJob).countBy({ planId })).toBe(0);
		expect((await snapshot()).revision).toBe(1);
	});

	it('lets nested jobs inherit a task without controlling its status', async () => {
		const owner = await register();
		const child = await db.getRepository(AgentExecutionThread).save({
			id: owner.childThreadId!,
			parentThreadId: thread.id,
			agentId,
			projectId,
			agentName: 'Child',
		});
		const nested = await register(0, child.id, true);
		await db.getRepository(AgentBackgroundJob).update(nested.id, { status: 'failed' });

		expect((await snapshot()).data.items[0]).toMatchObject({
			jobId: owner.id,
			status: 'in_progress',
		});

		await db.getRepository(AgentBackgroundJob).update(owner.id, { status: 'completed' });

		expect((await snapshot()).data.items[0].status).toBe('done');
		expect((await snapshot()).revision).toBe(2);
	});

	it('uses completed jobs to admit dependent work', async () => {
		const data = (await snapshot()).data;
		data.items[1].dependsOn = [tasks[0].id];
		await edit(data);
		const first = await register();

		await expect(register(1)).rejects.toThrow('prerequisites');

		await db.getRepository(AgentBackgroundJob).update(first.id, { status: 'completed' });

		await expect(register(1)).resolves.toMatchObject(ref(1));
	});

	it('rejects status overrides but permits result and title edits', async () => {
		const job = await register();
		await db.getRepository(AgentBackgroundJob).update(job.id, { status: 'completed' });
		const data = (await snapshot()).data;
		data.items[0].status = 'in_progress';

		await expect(edit(data)).rejects.toThrow('background job controls');

		data.items[0].status = 'done';
		data.items[0].title = 'Research complete';
		data.items[0].resultSummary = 'Saved findings';

		expect((await edit(data)).data.items[0]).toMatchObject({
			status: 'done',
			title: 'Research complete',
		});
	});

	it('pauses manual tasks and selectively restores pending or active work', async () => {
		const data = (await snapshot()).data;
		data.items[0].status = 'in_progress';
		await edit(data);
		const saved = await stop();
		await plans.pauseManualTasks(thread.id, planId, {});

		expect((await snapshot()).data.items.map((item) => item.status)).toEqual([
			'paused',
			'paused',
			'paused',
		]);

		await plans.releaseStoppedTasks(thread.id, planId, saved.pause.id, [tasks[0].id, tasks[1].id]);

		expect((await snapshot()).data.items.map((item) => item.status)).toEqual([
			'in_progress',
			'pending',
			'paused',
		]);
		expect((await snapshot()).data.items[1].startedAt).toBeNull();
	});

	it('restores unstarted manual tasks to pending without starting blocked work', async () => {
		const data = (await snapshot()).data;
		data.items[1].dependsOn = [tasks[0].id];
		await edit(data);
		const saved = await stop();
		await plans.pauseManualTasks(thread.id, planId, {});

		expect(await plans.selectStoppedTasks(thread.id, planId, [tasks[1].id])).toMatchObject({
			blocked: [{ id: tasks[1].id, blockedBy: [tasks[0].id] }],
		});

		await plans.releaseStoppedTasks(thread.id, planId, saved.pause.id, [tasks[1].id]);

		expect((await snapshot()).data.items[1].status).toBe('pending');
		expect((await snapshot()).readiness.blocked).toContainEqual({
			id: tasks[1].id,
			blockedBy: [tasks[0].id],
		});
	});

	it('keeps delegated work stopped during reservation and resumes the same job', async () => {
		const job = await register();
		const saved = await stop();
		await db.getRepository(AgentBackgroundJob).update(job.id, {
			status: 'paused',
			pauseRequestId: saved.pause.id,
			notifiedAt: new Date(),
			settledAt: new Date(),
		});
		await plans.pauseManualTasks(thread.id, planId, {});

		expect(await plans.selectStoppedTasks(thread.id, planId, [tasks[0].id])).toMatchObject({
			status: 'selected',
			jobs: [expect.objectContaining({ id: job.id })],
		});
		expect(
			await jobs.reservePlanJobs(
				thread.id,
				saved.pause.id,
				[job.id],
				new Date(Date.now() + 60000),
				10,
			),
		).toBe('reserved');
		expect((await snapshot()).data.items[0].status).toBe('paused');

		await db.getRepository(AgentBackgroundJob).update(job.id, {
			status: 'running',
			pauseRequestId: null,
			notifiedAt: null,
			settledAt: null,
		});

		expect((await snapshot()).data.items[0]).toMatchObject({
			jobId: job.id,
			status: 'in_progress',
		});
	});

	it('requires a new task and job after a workflow is cancelled', async () => {
		const input = {
			id: randomUUID(),
			kind: 'workflow' as const,
			parentAgentId: agentId,
			parentThreadId: thread.id,
			parentResourceId: 'test',
			parentPrincipalHash: 'principal',
			title: 'Workflow',
			childExecutionId: randomUUID(),
			workflowId: randomUUID(),
			planTask: ref(),
		};
		await jobs.insertWorkflowJobOrGetExisting(input);
		await db
			.getRepository(AgentBackgroundJob)
			.update(input.id, { status: 'cancelled', settledAt: new Date() });

		await expect(
			jobs.insertWorkflowJobOrGetExisting({
				...input,
				id: randomUUID(),
				childExecutionId: randomUUID(),
			}),
		).rejects.toThrow('unfinished leaf');

		const data = (await snapshot()).data;
		const followup = task('Repeat workflow');
		data.items.push(followup);
		await edit(data);
		await jobs.insertWorkflowJobOrGetExisting({
			...input,
			id: randomUUID(),
			childExecutionId: randomUUID(),
			planTask: { planId, planTaskId: followup.id },
		});

		expect((await snapshot()).data.items.map((item) => item.status)).toEqual([
			'cancelled',
			'pending',
			'pending',
			'in_progress',
		]);
	});

	it('creates a new plan in a conversation after its plan was removed', async () => {
		await db.getRepository(AgentPlan).delete(planId);

		expect(await service().findLatestPlan(thread.id, {})).toBeNull();

		const replacement = await service().createActivePlan(
			{
				id: randomUUID(),
				threadId: thread.id,
				formatVersion: 2,
				data: { title: 'New plan', description: '', items: [task('New work')] },
			},
			{},
		);

		expect(await service().findLatestPlan(thread.id, {})).toEqual(replacement);
	});

	it('retains linked job outcomes while the plan exists', async () => {
		const job = await register();
		await db.getRepository(AgentBackgroundJob).update(job.id, {
			status: 'completed',
			settledAt: new Date(0),
			notifiedAt: new Date(),
			result: 'Saved findings',
		});
		await jobs.deleteSettledBefore(new Date());

		expect(await jobs.findById(job.id)).toMatchObject({ result: 'Saved findings' });

		await db.getRepository(AgentPlan).delete(planId);
		await jobs.deleteSettledBefore(new Date());

		expect(await jobs.findById(job.id)).toBeNull();
	});
});
