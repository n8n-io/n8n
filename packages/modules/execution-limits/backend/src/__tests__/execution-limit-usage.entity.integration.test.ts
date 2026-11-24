import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { ExecutionLimitInstanceUsage } from '../execution-limit-instance-usage.entity';
import { ExecutionLimitUsage } from '../execution-limit-usage.entity';

describe('ExecutionLimitUsage', () => {
	const originalTimeZone = process.env.TZ;
	let usage: Repository<ExecutionLimitUsage>;
	let instanceUsage: Repository<ExecutionLimitInstanceUsage>;

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		usage = Container.get(DataSource).getRepository(ExecutionLimitUsage);
		instanceUsage = Container.get(DataSource).getRepository(ExecutionLimitInstanceUsage);
	});

	beforeEach(async () => {
		await usage.clear();
		await instanceUsage.clear();
	});

	afterEach(() => {
		if (originalTimeZone === undefined) delete process.env.TZ;
		else process.env.TZ = originalTimeZone;
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('reads a row back with a string day, number counts and a Date', async () => {
		const updatedAt = new Date('2026-11-19T10:00:00.123Z');
		await usage.insert({
			projectId: 'project-1',
			day: '2026-11-19',
			entityType: 'workflow',
			startedCount: 7,
			blockedCount: 2,
			updatedAt,
		});

		const row = await usage.findOneByOrFail({ projectId: 'project-1' });

		expect(row).toMatchObject({
			projectId: 'project-1',
			day: '2026-11-19',
			entityType: 'workflow',
			startedCount: 7,
			blockedCount: 2,
		});
		expect(row.updatedAt).toEqual(updatedAt);
	});

	it('defaults both counts to 0', async () => {
		await usage.insert({
			projectId: 'project-1',
			day: '2026-11-19',
			entityType: 'agent',
			updatedAt: new Date(),
		});

		const row = await usage.findOneByOrFail({ projectId: 'project-1' });

		expect(row).toMatchObject({ startedCount: 0, blockedCount: 0 });
	});

	it('reads an instance row back with a string day and number counts', async () => {
		const updatedAt = new Date('2026-11-19T10:00:00.123Z');
		await instanceUsage.insert({
			day: '2026-11-19',
			entityType: 'agent',
			startedCount: 9,
			blockedCount: 1,
			updatedAt,
		});

		const row = await instanceUsage.findOneByOrFail({ day: '2026-11-19' });

		expect(row).toMatchObject({
			day: '2026-11-19',
			entityType: 'agent',
			startedCount: 9,
			blockedCount: 1,
		});
		expect(row.updatedAt).toEqual(updatedAt);
	});

	it('keeps the instance rows apart from the project rows', async () => {
		const row = { day: '2026-11-19', entityType: 'workflow' as const, updatedAt: new Date() };
		await usage.insert({ ...row, projectId: 'project-1', startedCount: 4 });
		await instanceUsage.insert({ ...row, startedCount: 4 });

		expect(await usage.sum('startedCount', { day: '2026-11-19' })).toBe(4);
	});

	it.each(['Pacific/Kiritimati', 'Pacific/Pago_Pago'])(
		'keeps the same day when the process time zone is %s',
		async (timeZone) => {
			process.env.TZ = timeZone;
			await usage.insert({
				projectId: 'project-1',
				day: '2026-11-19',
				entityType: 'workflow',
				updatedAt: new Date(),
			});

			const row = await usage.findOneByOrFail({ day: '2026-11-19' });

			expect(row.day).toBe('2026-11-19');
		},
	);
});
