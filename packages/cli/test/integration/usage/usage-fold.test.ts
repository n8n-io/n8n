import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import {
	StatisticsNames,
	UsageByPeriod,
	UsageEvent,
	UsageLedgerEntry,
	UsageRepository,
	WorkflowStatisticsRepository,
	type Project,
	type WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { UsageConfig } from '@/usage/usage.config';
import { UsageFoldService } from '@/usage/usage-fold.service';
import { UsageLedgerPruningTask } from '@/usage/usage-ledger-pruning.task';
import { UsageQueryService } from '@/usage/usage-query.service';
import { UsageRecorder, type FinishedWorkflowRun } from '@/usage/usage-recorder.service';
import type { UsageUnit } from '@/usage/usage-units';

const TODAY = new Date('2026-10-12T10:00:00.000Z');
const YESTERDAY_LATE = new Date('2026-10-11T23:59:59.000Z');
const UNITS: UsageUnit[] = [
	'root_production',
	'all_production',
	'manual',
	'all_runs',
	'agent_message',
];

describe('UsageFoldService', () => {
	let recorder: UsageRecorder;
	let fold: UsageFoldService;
	let query: UsageQueryService;
	let dataSource: DataSource;
	let projectA: Project;
	let projectB: Project;
	let workflowA: WorkflowEntity;
	let workflowB: WorkflowEntity;

	beforeAll(async () => {
		await testDb.init();
		recorder = Container.get(UsageRecorder);
		fold = Container.get(UsageFoldService);
		query = Container.get(UsageQueryService);
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'UsageEvent',
			'UsageLedgerEntry',
			'UsageByPeriod',
			'WorkflowStatistics',
			'WorkflowEntity',
			'Project',
		]);
		projectA = await createTeamProject('Project A');
		projectB = await createTeamProject('Project B');
		workflowA = await createWorkflow({ name: 'Workflow A' }, projectA);
		workflowB = await createWorkflow({ name: 'Workflow B' }, projectB);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const run = async (
		workflow: WorkflowEntity,
		mode: WorkflowExecuteMode,
		status: ExecutionStatus = 'success',
		overrides: Partial<FinishedWorkflowRun> = {},
	) => {
		await recorder.recordWorkflowRun({
			executionId: randomUUID(),
			workflowId: workflow.id,
			workflowName: workflow.name,
			mode,
			status,
			startedAt: TODAY,
			endedAt: TODAY,
			...overrides,
		});
	};

	const agentMessage = async (
		project: Project,
		{ isTest = false, parentThreadId = null as string | null } = {},
		executionId = randomUUID(),
	) => {
		await recorder.recordAgentMessage(
			{
				executionId,
				agentId: 'agent-1',
				agentName: 'Support agent',
				projectId: project.id,
				source: 'slack',
				isTest,
				parentThreadId,
				status: 'success',
				startedAt: TODAY,
				endedAt: TODAY,
			},
			{},
		);
	};

	/** Every unit's total for one project on one UTC day, as a reader would see it. */
	const totalsOn = async (project: Project, day: string) => {
		const from = new Date(`${day}T00:00:00.000Z`);
		const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
		const totals: Partial<Record<UsageUnit, number>> = {};
		for (const unit of UNITS) totals[unit] = await query.total(project.id, unit, from, to);
		return totals;
	};

	const allTime = async (project: Project, unit: UsageUnit) =>
		await query.total(project.id, unit, new Date(0), new Date('2100-01-01T00:00:00.000Z'));

	const statistic = async (workflowId: string, name: StatisticsNames) =>
		await Container.get(WorkflowStatisticsRepository).findOneBy({ workflowId, name });

	it('applies every unit at read time, per project and UTC day, and keeps workflow_statistics totals', async () => {
		// Project A: 2 root runs today, 1 root run yesterday, a sub-workflow, an error workflow,
		// a manual run, a chat run, a canceled run and a still-waiting run.
		await run(workflowA, 'webhook');
		await run(workflowA, 'trigger', 'error');
		await run(workflowA, 'webhook', 'success', { endedAt: YESTERDAY_LATE });
		await run(workflowA, 'integrated', 'success', { parentExecutionId: randomUUID() });
		await run(workflowA, 'error');
		await run(workflowA, 'manual');
		await run(workflowA, 'chat');
		await run(workflowA, 'webhook', 'canceled');
		await run(workflowA, 'webhook', 'waiting');
		await run(workflowB, 'trigger');
		// Agents in project A: two top-level messages, a sub-agent message and a draft message.
		await agentMessage(projectA);
		await agentMessage(projectA);
		await agentMessage(projectA, { parentThreadId: 'parent-thread' });
		await agentMessage(projectA, { isTest: true });

		await fold.foldAll();

		expect(await totalsOn(projectA, '2026-10-12')).toEqual({
			root_production: 2,
			all_production: 4,
			manual: 1,
			all_runs: 7,
			agent_message: 2,
		});
		expect(await totalsOn(projectA, '2026-10-11')).toEqual({
			root_production: 1,
			all_production: 1,
			manual: 0,
			all_runs: 1,
			agent_message: 0,
		});
		expect(await totalsOn(projectB, '2026-10-12')).toMatchObject({
			root_production: 1,
			all_runs: 1,
		});

		// Same numbers the legacy writers produced: sub-workflows and error workflows add to
		// `count` but not `rootCount`; chat, canceled and waiting runs add nothing.
		const success = await statistic(workflowA.id, StatisticsNames.productionSuccess);
		const failure = await statistic(workflowA.id, StatisticsNames.productionError);
		const manual = await statistic(workflowA.id, StatisticsNames.manualSuccess);
		expect(success).toMatchObject({ count: 4, rootCount: 2, workflowName: 'Workflow A' });
		expect(failure).toMatchObject({ count: 1, rootCount: 1 });
		expect(manual).toMatchObject({ count: 1, rootCount: 0 });

		expect(await dataSource.getRepository(UsageEvent).count()).toBe(0);
		// Every final run and every agent message has one ledger row; the waiting run has none.
		expect(await dataSource.getRepository(UsageLedgerEntry).count()).toBe(13);
	});

	it('keeps runs that no unit counts, so a new question needs no rebuild', async () => {
		await run(workflowA, 'chat');
		await run(workflowA, 'webhook', 'canceled');
		await run(workflowA, 'webhook', 'canceled');
		await run(workflowA, 'integrated', 'success', { parentExecutionId: randomUUID() });
		await fold.foldAll();

		const grid = await dataSource.getRepository(UsageByPeriod).findBy({ projectId: projectA.id });
		expect(grid).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					trigger: 'chat',
					status: 'success',
					periodUnit: 'hour',
					count: 1,
				}),
				expect.objectContaining({ trigger: 'webhook', status: 'canceled', count: 2 }),
				expect.objectContaining({ trigger: 'integrated', hasParent: true, count: 1 }),
			]),
		);

		const { total: canceled } = await Container.get(UsageRepository).sumUsage(
			projectA.id,
			new Date(0),
			new Date('2100-01-01T00:00:00.000Z'),
			[{ kind: 'workflow', statusIn: ['canceled'] }],
		);
		expect(canceled).toBe(2);
	});

	it('keeps phases apart: a start counts only on the start clock and never in workflow_statistics', async () => {
		const executionId = randomUUID();
		const started = {
			kind: 'workflow' as const,
			executionId,
			phase: 'started' as const,
			subjectId: workflowA.id,
			subjectName: workflowA.name,
			projectId: projectA.id,
			trigger: 'webhook',
			status: 'running',
			origin: null,
			isTest: false,
			parentId: null,
			startedAt: TODAY,
			occurredAt: TODAY,
		};
		// No writer emits starts yet, so append one directly; the repeat must count once.
		await Container.get(UsageRepository).append(started);
		await Container.get(UsageRepository).append(started);
		await run(workflowA, 'webhook', 'success', { executionId });
		await fold.foldAll();

		const from = new Date('2026-10-12T00:00:00.000Z');
		const to = new Date('2026-10-13T00:00:00.000Z');
		expect(await query.total(projectA.id, 'all_runs', from, to, 'started')).toBe(1);
		expect(await query.total(projectA.id, 'all_runs', from, to, 'finished')).toBe(1);
		expect(await query.total(projectA.id, 'root_production', from, to)).toBe(1);
		expect(await statistic(workflowA.id, StatisticsNames.productionSuccess)).toMatchObject({
			count: 1,
			rootCount: 1,
		});
		expect(await dataSource.getRepository(UsageLedgerEntry).countBy({ executionId })).toBe(2);
	});

	it('counts a fact delivered twice only once, even across folds', async () => {
		const executionId = randomUUID();
		await run(workflowA, 'webhook', 'success', { executionId });
		await run(workflowA, 'webhook', 'success', { executionId });
		await fold.foldAll();
		await run(workflowA, 'webhook', 'success', { executionId });
		await agentMessage(projectA, {}, executionId);
		await fold.foldAll();

		const success = await statistic(workflowA.id, StatisticsNames.productionSuccess);
		expect(success).toMatchObject({ count: 1, rootCount: 1 });
		// The agent message shares the id but is another kind, so it still counts.
		expect(await totalsOn(projectA, '2026-10-12')).toMatchObject({
			root_production: 1,
			agent_message: 1,
		});
	});

	it('adds to existing totals instead of replacing them', async () => {
		await run(workflowB, 'trigger');
		await fold.foldAll();
		await run(workflowB, 'trigger');
		await run(workflowB, 'trigger');
		await fold.foldAll();

		expect(await totalsOn(projectB, '2026-10-12')).toMatchObject({ root_production: 3 });
		expect(await statistic(workflowB.id, StatisticsNames.productionSuccess)).toMatchObject({
			count: 3,
			rootCount: 3,
		});
	});

	describe('ledger pruning', () => {
		const prune = async (retentionDays: number) => {
			Container.get(UsageConfig).ledgerRetentionDays = retentionDays;
			await Container.get(UsageLedgerPruningTask).run(new AbortController().signal);
		};
		const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		it('deletes ledger rows past the retention window and keeps the totals', async () => {
			await run(workflowB, 'trigger', 'success', { endedAt: daysAgo(10) });
			await run(workflowB, 'trigger', 'success', { endedAt: daysAgo(8) });
			await run(workflowB, 'trigger', 'success', { endedAt: daysAgo(1) });
			await fold.foldAll();

			await prune(new UsageConfig().ledgerRetentionDays);

			const kept = await dataSource.getRepository(UsageLedgerEntry).find();
			expect(kept).toHaveLength(1);
			expect(kept[0].occurredAt.getTime()).toBeGreaterThan(daysAgo(2).getTime());
			expect(await allTime(projectB, 'root_production')).toBe(3);
			expect(await statistic(workflowB.id, StatisticsNames.productionSuccess)).toMatchObject({
				count: 3,
			});
		});

		it('keeps every ledger row when retention is 0', async () => {
			await run(workflowB, 'trigger', 'success', { endedAt: daysAgo(400) });
			await fold.foldAll();

			await prune(0);

			expect(await dataSource.getRepository(UsageLedgerEntry).count()).toBe(1);
		});
	});

	it('folds a backlog larger than one batch', async () => {
		const runs = 2500;
		for (let i = 0; i < runs; i++) await run(workflowB, 'trigger');

		await fold.foldAll();

		expect(await statistic(workflowB.id, StatisticsNames.productionSuccess)).toMatchObject({
			count: runs,
			rootCount: runs,
		});
		expect(await allTime(projectB, 'root_production')).toBe(runs);
		expect(await dataSource.getRepository(UsageEvent).count()).toBe(0);
	}, 60_000);
});
