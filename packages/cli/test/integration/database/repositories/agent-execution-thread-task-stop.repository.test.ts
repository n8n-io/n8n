import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';
import { AgentBackgroundJob } from '@/modules/agents/entities/agent-background-job.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentMessageQueueRepository } from '@/modules/agents/repositories/agent-message-queue.repository';
import { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';
import { AgentPlanRepository } from '@/modules/agents/repositories/agent-plan.repository';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';

const beforeStop = new Date('2026-10-01T10:00:00.000Z');
const cutoffAt = new Date('2026-10-01T10:01:00.000Z');

describe('AgentExecutionThreadRepository task stops', () => {
	let db: DataSource;
	let repository: AgentExecutionThreadRepository;
	let queue: AgentMessageQueueRepository;
	let plans: AgentPlanRepository;
	let thread: AgentExecutionThread;
	let agentId: string;
	let projectId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		db = Container.get(DataSource);
		repository = Container.get(AgentExecutionThreadRepository);
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
	afterEach(async () => {
		await db.getRepository(AgentExecutionThread).delete({ agentId });
	});
	afterAll(async () => await testDb.terminate());

	async function request(planId: string | null = null) {
		return await repository.saveStop(
			{
				threadId: thread.id,
				planId,
				requestedAt: cutoffAt.toISOString(),
				generation: await repository.captureStopTargets(thread.id, {}),
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

	async function job(parentThreadId = thread.id, sourceExecutionId?: string) {
		return await db.getRepository(AgentBackgroundJob).save({
			id: randomUUID(),
			parentThreadId,
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:test',
			parentPrincipalHash: 'principal',
			title: 'Research',
			kind: 'subagent',
			status: 'running',
			sourceExecutionId,
		});
	}

	it('captures known descendants once and ignores later work from the same execution', async () => {
		const execution = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'success' });
		const child = await db.getRepository(AgentExecutionThread).save({
			id: randomUUID(),
			agentId,
			agentName: 'Child',
			projectId,
			parentThreadId: thread.id,
		});
		const known = await job(child.id);
		const stop = await request();
		await job(child.id, execution.id);
		await job(thread.id, execution.id);
		expect(stop.generation.threadIds).toContain(child.id);
		expect((await repository.findJobsCapturedByStop(stop)).map(({ id }) => id)).toEqual([known.id]);
		expect(await repository.findStopTargetsStillActive(stop)).toEqual([
			{ jobId: known.id, title: 'Research' },
		]);
		await db.getRepository(AgentBackgroundJob).update(known.id, { status: 'paused' });
		expect(await repository.findStopTargetsStillActive(stop)).toEqual([]);
	});

	it('captures only unfinished executions and jobs', async () => {
		const executions = db.getRepository(AgentExecution);
		const running = await executions.save({
			id: randomUUID(),
			threadId: thread.id,
			status: 'running',
		});
		const approval = await executions.save({
			id: randomUUID(),
			threadId: thread.id,
			status: 'success',
			hitlStatus: 'suspended',
		});
		await executions.save({ id: randomUUID(), threadId: thread.id, status: 'success' });
		await executions.save({ id: randomUUID(), threadId: thread.id, status: 'error' });

		const jobs = db.getRepository(AgentBackgroundJob);
		const active = await job();
		const suspended = await job();
		const unreported = await job();
		const reported = await job();
		const reportedFailure = await job();
		await jobs.update(suspended.id, { status: 'suspended', notifiedAt: new Date() });
		await jobs.update(unreported.id, { status: 'completed' });
		await jobs.update(reported.id, { status: 'completed', notifiedAt: new Date() });
		await jobs.update(reportedFailure.id, { status: 'failed', notifiedAt: new Date() });

		const stop = await request();

		expect(stop.generation.executionIds.sort()).toEqual([running.id, approval.id].sort());
		expect(stop.generation.jobIds.sort()).toEqual([active.id, suspended.id, unreported.id].sort());
	});

	it('handles a Stop request without unfinished work', async () => {
		await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'success' });
		const stop = await request();

		expect(stop.generation).toEqual({ executionIds: [], jobIds: [], threadIds: [] });
		expect(await repository.findJobsCapturedByStop(stop)).toEqual([]);
		expect(await repository.findStopTargetsStillActive(stop)).toEqual([]);
		await repository.finalizeStopReport(thread.id, stop.pause.id, randomUUID(), {});
		expect((await repository.findTaskStop(thread.id))?.pause.reportedAt).toEqual(
			expect.any(String),
		);
	});

	it('keeps a captured foreground approval unfinished', async () => {
		const execution = await db
			.getRepository(AgentExecution)
			.save({ id: randomUUID(), threadId: thread.id, status: 'success', hitlStatus: 'suspended' });
		const stop = await request();
		expect(await repository.findStopTargetsStillActive(stop)).toEqual([
			{ jobId: execution.id, title: 'Current response' },
		]);
	});

	it('assigns captured pending results to the report without claiming later jobs', async () => {
		const completed = await job();
		await db.getRepository(AgentBackgroundJob).update(completed.id, { status: 'completed' });
		const running = await job();
		const stop = await request();
		const later = await job();
		await Container.get(AgentBackgroundJobRepository).requestPauseForCapturedJobs(
			agentId,
			thread.id,
			'draft-chat:test',
			stop.pause.id,
			stop.generation.jobIds,
		);
		expect(
			(await db.getRepository(AgentBackgroundJob).findOneByOrFail({ id: completed.id }))
				.pauseRequestId,
		).toBe(stop.pause.id);
		expect(
			(await db.getRepository(AgentBackgroundJob).findOneByOrFail({ id: running.id }))
				.pauseRequestId,
		).toBe(stop.pause.id);
		expect(
			(await db.getRepository(AgentBackgroundJob).findOneByOrFail({ id: later.id })).pauseRequestId,
		).toBeNull();
		expect(await repository.hasTaskStopWithId(stop.pause.id)).toBe(true);
	});

	it('finds a pending Stop report on the thread or an ancestor until the report runs', async () => {
		const child = await db.getRepository(AgentExecutionThread).save({
			id: randomUUID(),
			agentId,
			agentName: 'Child',
			projectId,
			parentThreadId: thread.id,
		});
		const stop = await request();

		expect(
			(await repository.findPendingStopReports(child.id)).map(({ pause }) => pause.id),
		).toEqual([stop.pause.id]);

		await repository.saveStop(
			{ ...stop, pause: { ...stop.pause, reportedAt: new Date().toISOString() } },
			{},
		);

		expect(await repository.findPendingStopReports(child.id)).toEqual([]);
	});

	it('keeps late plan writes and dispatch available', async () => {
		await request();
		await expect(
			Container.get(AgentBackgroundJobRepository).insertSubAgentJobIfCapacity(
				{
					id: randomUUID(),
					parentThreadId: thread.id,
					parentAgentId: agentId,
					parentResourceId: 'draft-chat:test',
					parentPrincipalHash: 'principal',
					title: 'Late task',
					kind: 'subagent',
					subAgentId: agentId,
					childThreadId: randomUUID(),
					timeoutAt: new Date(Date.now() + 60000),
				},
				5,
			),
		).resolves.toBe(true);
		const plan = await plans.createActivePlan(
			{
				id: randomUUID(),
				threadId: thread.id,
				formatVersion: 1,
				data: { title: 'Late plan', items: [] },
			},
			{},
		);
		expect(plan.revision).toBe(1);
	});

	it('discards older pending input and preserves later input', async () => {
		await enqueue('Older input');
		await queue.discardPending(thread.id, {});
		const next = await enqueue('Continue');
		expect((await queue.findHead(thread.id, {}))?.id).toBe(next.id);
	});

	it('discards only the pending input that it read', async () => {
		await enqueue('Older input');
		const listPending = queue.listPending.bind(queue);
		let late: Awaited<ReturnType<typeof enqueue>> | undefined;
		vi.spyOn(queue, 'listPending').mockImplementationOnce(async (...args) => {
			const items = await listPending(...args);
			late = await enqueue('Late input');
			return items;
		});

		await queue.discardPending(thread.id, {});

		expect((await queue.listPending(thread.id, {})).map(({ id }) => id)).toEqual([late?.id]);
	});

	it.each(['success', 'error', 'cancelled'] as const)(
		'records a %s report and consumes its job notifications',
		async (status) => {
			const known = await job();
			const stop = await request();
			await db
				.getRepository(AgentBackgroundJob)
				.update(known.id, { status: 'paused', pauseRequestId: stop.pause.id });
			const execution = await db
				.getRepository(AgentExecution)
				.save({ id: randomUUID(), threadId: thread.id, status });
			expect(await repository.hasTaskStopWithId(stop.pause.id)).toBe(true);
			await repository.finalizeStopReport(thread.id, stop.pause.id, execution.id, {});
			expect((await repository.findTaskStop(thread.id))?.pause).toMatchObject({
				reportedAt: expect.any(String),
				reportFailed: status !== 'success',
			});
			expect(
				(await db.getRepository(AgentBackgroundJob).findOneByOrFail({ id: known.id })).notifiedAt,
			).not.toBeNull();
			await repository.markChatResumedAfterStop(thread.id, false, {});
			expect((await repository.findTaskStop(thread.id))?.pause.resumedAt).toBeUndefined();
			await repository.markChatResumedAfterStop(thread.id, true, {});
			expect((await repository.findTaskStop(thread.id))?.pause.resumedAt).toEqual(
				expect.any(String),
			);
		},
	);
});
