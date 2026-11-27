import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { ExecutionLimitInstanceUsage } from '../execution-limit-instance-usage.entity';
import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { ExecutionLimitUsageRepository } from '../execution-limit-usage.repository';

const CUTOFF_DAY = '2026-01-10';
const UPDATED_AT = new Date('2026-01-12T10:00:00.000Z');

describe('ExecutionLimitUsageRepository pruning', () => {
	let usage: Repository<ExecutionLimitUsage>;
	let instanceUsage: Repository<ExecutionLimitInstanceUsage>;
	let repository: ExecutionLimitUsageRepository;

	const projectRow = (overrides: Partial<ExecutionLimitUsage> = {}) => ({
		projectId: 'project-1',
		day: '2026-01-11',
		entityType: 'workflow' as const,
		startedCount: 1,
		blockedCount: 0,
		updatedAt: UPDATED_AT,
		...overrides,
	});

	const instanceRow = (overrides: Partial<ExecutionLimitInstanceUsage> = {}) => ({
		day: '2026-01-11',
		entityType: 'workflow' as const,
		startedCount: 1,
		blockedCount: 0,
		updatedAt: UPDATED_AT,
		...overrides,
	});

	const insertDays = async (days: string[]) => {
		for (const day of days) {
			await usage.insert(projectRow({ day }));
			await instanceUsage.insert(instanceRow({ day }));
		}
	};

	const remainingDays = async () => ({
		project: (await usage.find()).map((row) => row.day).sort(),
		instance: (await instanceUsage.find()).map((row) => row.day).sort(),
	});

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
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('deletes the days before the cutoff in both tables and keeps the cutoff day', async () => {
		await insertDays(['2026-01-08', '2026-01-09', '2026-01-10', '2026-01-11']);

		const deleted = await repository.deleteUsageBefore(CUTOFF_DAY, {});

		expect(deleted).toEqual({ projectRows: 2, instanceRows: 2 });
		expect(await remainingDays()).toEqual({
			project: ['2026-01-10', '2026-01-11'],
			instance: ['2026-01-10', '2026-01-11'],
		});
	});

	it('deletes old rows of every entity type and every project', async () => {
		const oldDay = '2026-01-05';
		await usage.insert(projectRow({ day: oldDay, entityType: 'workflow' }));
		await usage.insert(projectRow({ day: oldDay, entityType: 'agent' }));
		await usage.insert(projectRow({ day: oldDay, projectId: 'project-2', entityType: 'workflow' }));
		await usage.insert(projectRow({ day: oldDay, projectId: 'project-2', entityType: 'agent' }));
		await instanceUsage.insert(instanceRow({ day: oldDay, entityType: 'workflow' }));
		await instanceUsage.insert(instanceRow({ day: oldDay, entityType: 'agent' }));

		const deleted = await repository.deleteUsageBefore(CUTOFF_DAY, {});

		expect(deleted).toEqual({ projectRows: 4, instanceRows: 2 });
		expect(await remainingDays()).toEqual({ project: [], instance: [] });
	});

	it('deletes nothing on a second call', async () => {
		await insertDays(['2026-01-08', '2026-01-11']);
		await repository.deleteUsageBefore(CUTOFF_DAY, {});

		const deleted = await repository.deleteUsageBefore(CUTOFF_DAY, {});

		expect(deleted).toEqual({ projectRows: 0, instanceRows: 0 });
		expect(await remainingDays()).toEqual({ project: ['2026-01-11'], instance: ['2026-01-11'] });
	});

	it('deletes nothing when no row is older than the cutoff', async () => {
		await insertDays(['2026-01-10', '2026-01-11']);

		const deleted = await repository.deleteUsageBefore(CUTOFF_DAY, {});

		expect(deleted).toEqual({ projectRows: 0, instanceRows: 0 });
		expect(await remainingDays()).toEqual({
			project: ['2026-01-10', '2026-01-11'],
			instance: ['2026-01-10', '2026-01-11'],
		});
	});
});
