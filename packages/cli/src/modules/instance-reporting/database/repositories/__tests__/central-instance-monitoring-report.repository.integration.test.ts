import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import type { CentralInstanceMonitoringReport } from '../../entities/central-instance-monitoring-report';
import { CentralInstanceMonitoringReportRepository } from '../central-instance-monitoring-report.repository';

const REPORT_DATE = '2026-03-25';

const DATA_POINTS = [
	{ kind: 'cumulative', name: 'billableExecutions', value: 815 },
	{ kind: 'daily', name: 'billableExecutions', value: 42, date: REPORT_DATE },
] as CentralInstanceMonitoringReport['dataPoints'];

describe('CentralInstanceMonitoringReportRepository', () => {
	let repository: CentralInstanceMonitoringReportRepository;

	beforeAll(async () => {
		await testModules.loadModules(['instance-reporting']);
		await testDb.init();
		repository = Container.get(CentralInstanceMonitoringReportRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['CentralInstanceMonitoringReport']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('createPending', () => {
		test('records the measurement with a generated id, undelivered', async () => {
			const report = await repository.createPending(DATA_POINTS);

			expect(report.id).toEqual(expect.any(String));
			expect(report.deliveredAt).toBeNull();
			expect(report.attempts).toBe(0);
			expect(report.createdAt).toEqual(expect.any(Date));
			await expect(repository.findOneByOrFail({ id: report.id })).resolves.toMatchObject({
				dataPoints: DATA_POINTS,
			});
		});
	});

	describe('findTodaysPending', () => {
		test('returns nothing when no report was generated yet', async () => {
			await expect(repository.findTodaysPending(new Date())).resolves.toBeNull();
		});

		test("returns today's undelivered report with the numbers it measured", async () => {
			const created = await repository.createPending(DATA_POINTS);

			const pending = await repository.findTodaysPending(new Date());

			expect(pending?.id).toBe(created.id);
			expect(pending?.dataPoints).toEqual(DATA_POINTS);
		});

		test("returns nothing once today's report was delivered", async () => {
			const created = await repository.createPending(DATA_POINTS);
			await repository.markDelivered(created.id, new Date());

			await expect(repository.findTodaysPending(new Date())).resolves.toBeNull();
		});

		test("ignores an earlier day's undelivered report, leaving it untouched", async () => {
			const stale = await repository.createPending(DATA_POINTS);

			const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

			await expect(repository.findTodaysPending(tomorrow)).resolves.toBeNull();
			// The stale report keeps the numbers it measured; only backfill may touch it.
			await expect(repository.findOneByOrFail({ id: stale.id })).resolves.toMatchObject({
				dataPoints: DATA_POINTS,
				deliveredAt: null,
			});
		});
	});

	describe('hasDeliveredToday', () => {
		test('is false when no report was generated yet', async () => {
			await expect(repository.hasDeliveredToday(new Date())).resolves.toBe(false);
		});

		test("is false while today's report is still pending", async () => {
			await repository.createPending(DATA_POINTS);

			await expect(repository.hasDeliveredToday(new Date())).resolves.toBe(false);
		});

		test("is true once today's report was delivered", async () => {
			const created = await repository.createPending(DATA_POINTS);
			await repository.markDelivered(created.id, new Date());

			await expect(repository.hasDeliveredToday(new Date())).resolves.toBe(true);
		});

		test("ignores an earlier day's delivered report", async () => {
			const delivered = await repository.createPending(DATA_POINTS);
			await repository.markDelivered(delivered.id, new Date());

			const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

			await expect(repository.hasDeliveredToday(tomorrow)).resolves.toBe(false);
		});
	});

	describe('markDelivered', () => {
		test('stamps the delivery time, counts the attempt and clears any earlier error', async () => {
			const { id } = await repository.createPending(DATA_POINTS);
			await repository.recordFailure(id, 'Network error');
			const deliveredAt = new Date('2026-03-26T07:42:00.000Z');

			await repository.markDelivered(id, deliveredAt);

			const stored = await repository.findOneByOrFail({ id });
			expect(stored.deliveredAt?.toISOString()).toBe(deliveredAt.toISOString());
			expect(stored.attempts).toBe(2);
			expect(stored.lastError).toBeNull();
		});
	});

	describe('recordFailure', () => {
		test('counts the attempt and keeps the report undelivered', async () => {
			const { id } = await repository.createPending(DATA_POINTS);

			await repository.recordFailure(id, 'Network error');
			await repository.recordFailure(id, 'Still down');

			await expect(repository.findOneByOrFail({ id })).resolves.toMatchObject({
				attempts: 2,
				lastError: 'Still down',
				deliveredAt: null,
			});
		});
	});
});
