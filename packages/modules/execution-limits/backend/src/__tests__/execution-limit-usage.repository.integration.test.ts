import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { ExecutionLimitInstanceUsage } from '../execution-limit-instance-usage.entity';
import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { ExecutionLimitUsageRepository } from '../execution-limit-usage.repository';
import { ExecutionLimitsService } from '../execution-limits.service';

const FIRST_DAY = '2026-11-16';
const LAST_DAY = '2026-11-22';
const UPDATED_AT = new Date('2026-11-20T10:00:00.000Z');

describe('ExecutionLimitUsageRepository reads', () => {
	let usage: Repository<ExecutionLimitUsage>;
	let instanceUsage: Repository<ExecutionLimitInstanceUsage>;
	let repository: ExecutionLimitUsageRepository;

	const projectRow = (overrides: Partial<ExecutionLimitUsage> = {}) => ({
		projectId: 'project-1',
		day: '2026-11-19',
		entityType: 'workflow' as const,
		startedCount: 0,
		blockedCount: 0,
		updatedAt: UPDATED_AT,
		...overrides,
	});

	const instanceRow = (overrides: Partial<ExecutionLimitInstanceUsage> = {}) => ({
		day: '2026-11-19',
		entityType: 'workflow' as const,
		startedCount: 0,
		blockedCount: 0,
		updatedAt: UPDATED_AT,
		...overrides,
	});

	const limitProject = async (maxExecutions = 100) => {
		const project = await createTeamProject();
		await Container.get(ExecutionLimitsService).setProjectLimits(
			[{ projectId: project.id, maxExecutions }],
			null,
		);
		return project.id;
	};

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		usage = Container.get(DataSource).getRepository(ExecutionLimitUsage);
		instanceUsage = Container.get(DataSource).getRepository(ExecutionLimitInstanceUsage);
		repository = Container.get(ExecutionLimitUsageRepository);
	});

	beforeEach(async () => {
		await usage.clear();
		await instanceUsage.clear();
		// The delete of a project also deletes its limit.
		await testDb.truncate(['Project', 'Settings']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('reads each scope from its own table and never adds the two', async () => {
		await usage.insert(projectRow({ startedCount: 4 }));
		await instanceUsage.insert(instanceRow({ startedCount: 4 }));

		const project = await repository.sumProjectUsage('project-1', FIRST_DAY, LAST_DAY, {});
		const instance = await repository.sumInstanceUsage(FIRST_DAY, LAST_DAY, {});

		expect(project.startedCount).toBe(4);
		expect(instance.startedCount).toBe(4);
	});

	it('reads the project table only for a project, and the instance table only for the instance', async () => {
		await usage.insert(projectRow({ startedCount: 4 }));

		expect((await repository.sumInstanceUsage(FIRST_DAY, LAST_DAY, {})).startedCount).toBe(0);

		await usage.clear();
		await instanceUsage.insert(instanceRow({ startedCount: 7 }));

		const project = await repository.sumProjectUsage('project-1', FIRST_DAY, LAST_DAY, {});
		expect(project.startedCount).toBe(0);
	});

	it('includes the first and the last day and leaves out the days around them', async () => {
		const days = ['2026-11-15', FIRST_DAY, '2026-11-19', LAST_DAY, '2026-11-23'];
		await usage.insert(days.map((day) => projectRow({ day, startedCount: 1 })));
		await instanceUsage.insert(days.map((day) => instanceRow({ day, startedCount: 1 })));

		const project = await repository.sumProjectUsage('project-1', FIRST_DAY, LAST_DAY, {});
		const instance = await repository.sumInstanceUsage(FIRST_DAY, LAST_DAY, {});

		expect(project.startedCount).toBe(3);
		expect(instance.startedCount).toBe(3);
	});

	it('sums the started and the blocked counts as numbers', async () => {
		await usage.insert([
			projectRow({ day: '2026-11-18', startedCount: 5, blockedCount: 1 }),
			projectRow({ day: '2026-11-19', startedCount: 3, blockedCount: 2 }),
		]);

		const totals = await repository.sumProjectUsage('project-1', FIRST_DAY, LAST_DAY, {});

		expect(totals).toMatchObject({ startedCount: 8, blockedCount: 3 });
	});

	it('leaves out the rows of agents and of other projects', async () => {
		await usage.insert([
			projectRow({ startedCount: 2 }),
			projectRow({ entityType: 'agent', startedCount: 10 }),
			projectRow({ projectId: 'project-2', startedCount: 20 }),
		]);
		await instanceUsage.insert([
			instanceRow({ startedCount: 2 }),
			instanceRow({ entityType: 'agent', startedCount: 10 }),
		]);

		const project = await repository.sumProjectUsage('project-1', FIRST_DAY, LAST_DAY, {});
		const instance = await repository.sumInstanceUsage(FIRST_DAY, LAST_DAY, {});

		expect(project.startedCount).toBe(2);
		expect(instance.startedCount).toBe(2);
	});

	it('gives the latest counted time as a Date', async () => {
		const earlier = new Date('2026-11-18T08:00:00.000Z');
		await usage.insert([
			projectRow({ day: '2026-11-18', updatedAt: earlier }),
			projectRow({ day: '2026-11-19', updatedAt: UPDATED_AT }),
		]);
		await instanceUsage.insert(instanceRow({ updatedAt: UPDATED_AT }));

		const project = await repository.sumProjectUsage('project-1', FIRST_DAY, LAST_DAY, {});
		const instance = await repository.sumInstanceUsage(FIRST_DAY, LAST_DAY, {});

		expect(project.lastCountedAt).toEqual(UPDATED_AT);
		expect(instance.lastCountedAt).toEqual(UPDATED_AT);
	});

	it('gives zero counts and no counted time when the range has no row', async () => {
		const empty = { startedCount: 0, blockedCount: 0, lastCountedAt: null };

		expect(await repository.sumProjectUsage('project-1', FIRST_DAY, LAST_DAY, {})).toEqual(empty);
		expect(await repository.sumInstanceUsage(FIRST_DAY, LAST_DAY, {})).toEqual(empty);
		expect(await repository.sumUsageOfLimitedProjects(FIRST_DAY, LAST_DAY, {})).toEqual(new Map());
	});

	it('gives zero counts for a range that ends before it starts', async () => {
		await usage.insert(projectRow({ startedCount: 4 }));
		await instanceUsage.insert(instanceRow({ startedCount: 4 }));

		const project = await repository.sumProjectUsage('project-1', LAST_DAY, FIRST_DAY, {});
		const instance = await repository.sumInstanceUsage(LAST_DAY, FIRST_DAY, {});

		expect(project.startedCount).toBe(0);
		expect(instance.startedCount).toBe(0);
		expect(await repository.sumUsageOfLimitedProjects(LAST_DAY, FIRST_DAY, {})).toEqual(new Map());
	});

	describe('sumUsageOfLimitedProjects', () => {
		it('sums each project that has a limit and leaves out the others', async () => {
			const limitedA = await limitProject();
			const limitedB = await limitProject();
			await usage.insert([
				projectRow({ projectId: limitedA, day: '2026-11-18', startedCount: 5, blockedCount: 1 }),
				projectRow({ projectId: limitedA, day: '2026-11-19', startedCount: 3 }),
				projectRow({ projectId: limitedA, day: '2026-11-23', startedCount: 50 }),
				projectRow({ projectId: limitedA, entityType: 'agent', startedCount: 50 }),
				projectRow({ projectId: limitedB, startedCount: 2 }),
				projectRow({ projectId: 'not-limited', startedCount: 9 }),
			]);

			const totals = await repository.sumUsageOfLimitedProjects(FIRST_DAY, LAST_DAY, {});

			expect([...totals.keys()].sort()).toEqual([limitedA, limitedB].sort());
			expect(totals.get(limitedA)).toEqual({
				startedCount: 8,
				blockedCount: 1,
				lastCountedAt: UPDATED_AT,
			});
			expect(totals.get(limitedB)).toMatchObject({ startedCount: 2, blockedCount: 0 });
		});

		it('leaves out a limited project that has no usage row in the range', async () => {
			await limitProject();

			expect(await repository.sumUsageOfLimitedProjects(FIRST_DAY, LAST_DAY, {})).toEqual(
				new Map(),
			);
		});
	});

	it('reads inside a transaction on the connection of that transaction', async () => {
		await usage.insert(projectRow({ startedCount: 4 }));

		const totals = await Container.get(TransactionRunner).run(
			{},
			async (ctx) => await repository.sumProjectUsage('project-1', FIRST_DAY, LAST_DAY, ctx),
		);

		expect(totals.startedCount).toBe(4);
	});
});
