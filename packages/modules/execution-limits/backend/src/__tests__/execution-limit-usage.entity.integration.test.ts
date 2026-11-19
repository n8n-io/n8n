import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { EXECUTION_LIMIT_USAGE_INSTANCE_SCOPE_ID } from '../execution-limits.types';

describe('ExecutionLimitUsage', () => {
	const originalTimeZone = process.env.TZ;
	let usage: Repository<ExecutionLimitUsage>;

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		usage = Container.get(DataSource).getRepository(ExecutionLimitUsage);
	});

	beforeEach(async () => {
		await usage.clear();
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

	it('stores the instance total without a project', async () => {
		await usage.insert({
			projectId: EXECUTION_LIMIT_USAGE_INSTANCE_SCOPE_ID,
			day: '2026-11-19',
			entityType: 'workflow',
			startedCount: 1,
			updatedAt: new Date(),
		});

		expect(await usage.countBy({ projectId: EXECUTION_LIMIT_USAGE_INSTANCE_SCOPE_ID })).toBe(1);
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
