import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { UsageByPeriod, type Project, type WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { startOfUtcDay } from '@/usage/usage-aggregation';
import { UsageConfig } from '@/usage/usage.config';
import { UsageCompactionService } from '@/usage/usage-compaction.service';
import { UsageFoldService } from '@/usage/usage-fold.service';
import { UsageQueryService } from '@/usage/usage-query.service';
import { UsageRecorder } from '@/usage/usage-recorder.service';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('UsageCompactionService', () => {
	let recorder: UsageRecorder;
	let fold: UsageFoldService;
	let compaction: UsageCompactionService;
	let query: UsageQueryService;
	let dataSource: DataSource;
	let project: Project;
	let workflow: WorkflowEntity;

	const today = startOfUtcDay(new Date());
	const dayAgo = (days: number) => new Date(today.getTime() - days * DAY_MS);
	const at = (day: Date, hour: number, minute = 0) =>
		new Date(day.getTime() + hour * 60 * 60 * 1000 + minute * 60 * 1000);

	beforeAll(async () => {
		await testDb.init();
		recorder = Container.get(UsageRecorder);
		fold = Container.get(UsageFoldService);
		compaction = Container.get(UsageCompactionService);
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
		Container.get(UsageConfig).hourlyRetentionDays = 7;
		project = await createTeamProject('Project');
		workflow = await createWorkflow({ name: 'Workflow' }, project);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const runAt = async (endedAt: Date) => {
		await recorder.recordWorkflowRun({
			executionId: randomUUID(),
			workflowId: workflow.id,
			workflowName: workflow.name,
			mode: 'webhook',
			status: 'success',
			startedAt: endedAt,
			endedAt,
		});
	};

	const grid = async () =>
		(await dataSource.getRepository(UsageByPeriod).find()).map((row) => ({
			unit: row.periodUnit,
			start: new Date(row.periodStart).toISOString(),
			count: row.count,
		}));

	const total = async (from: Date, to: Date) =>
		await query.total(project.id, 'root_production', from, to);

	it('writes one hourly row per UTC hour', async () => {
		await runAt(at(today, 10, 15));
		await runAt(at(today, 10, 45));
		await runAt(at(today, 11, 5));
		await fold.foldAll();

		expect(await grid()).toEqual(
			expect.arrayContaining([
				{ unit: 'hour', start: at(today, 10).toISOString(), count: 2 },
				{ unit: 'hour', start: at(today, 11).toISOString(), count: 1 },
			]),
		);
		expect(await grid()).toHaveLength(2);
	});

	it('rolls hours older than the window into days and keeps every total', async () => {
		const old = dayAgo(10);
		const lessOld = dayAgo(8);
		await runAt(at(old, 1));
		await runAt(at(old, 13));
		await runAt(at(old, 23, 59));
		await runAt(at(lessOld, 5));
		await runAt(at(dayAgo(2), 9));
		await runAt(at(today, 0, 30));
		await fold.foldAll();

		const ranges: Array<[Date, Date]> = [
			[dayAgo(30), new Date(today.getTime() + DAY_MS)],
			[old, dayAgo(9)],
			[lessOld, dayAgo(7)],
			[dayAgo(2), dayAgo(1)],
		];
		const before = await Promise.all(ranges.map(async ([from, to]) => await total(from, to)));

		expect(await compaction.compact()).toBe(4);

		const after = await Promise.all(ranges.map(async ([from, to]) => await total(from, to)));
		expect(after).toEqual(before);
		expect(after).toEqual([6, 3, 1, 1]);
		expect(await grid()).toEqual(
			expect.arrayContaining([
				{ unit: 'day', start: old.toISOString(), count: 3 },
				{ unit: 'day', start: lessOld.toISOString(), count: 1 },
				{ unit: 'hour', start: at(dayAgo(2), 9).toISOString(), count: 1 },
				{ unit: 'hour', start: at(today, 0).toISOString(), count: 1 },
			]),
		);
		expect(await grid()).toHaveLength(4);
	});

	it('adds a late fact for an already compacted day to its daily row', async () => {
		const old = dayAgo(10);
		await runAt(at(old, 8));
		await fold.foldAll();
		await compaction.compact();

		await runAt(at(old, 15));
		await fold.foldAll();
		await compaction.compact();

		expect(await grid()).toEqual([{ unit: 'day', start: old.toISOString(), count: 2 }]);
		expect(await total(old, dayAgo(9))).toBe(2);
	});

	it('does nothing a second time', async () => {
		await runAt(at(dayAgo(10), 8));
		await fold.foldAll();

		expect(await compaction.compact()).toBe(1);
		expect(await compaction.compact()).toBe(0);
		expect(await grid()).toHaveLength(1);
	});

	it('keeps hourly rows forever when the window is 0', async () => {
		Container.get(UsageConfig).hourlyRetentionDays = 0;
		await runAt(at(dayAgo(400), 8));
		await fold.foldAll();

		expect(await compaction.compact()).toBe(0);
		expect(await grid()).toEqual([
			{ unit: 'hour', start: at(dayAgo(400), 8).toISOString(), count: 1 },
		]);
	});
});
