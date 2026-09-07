import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import type { InstanceMonitoringReport } from '../../entities/instance-monitoring-report';
import { InstanceMonitoringReportRepository } from '../instance-monitoring-report.repository';

const REPORT_DATE = '2026-03-25';

const DATA_POINTS = [
	{ kind: 'cumulative', name: 'billableExecutions', value: 815 },
	{ kind: 'daily', name: 'billableExecutions', value: 42, date: REPORT_DATE },
] as InstanceMonitoringReport['dataPoints'];

describe('InstanceMonitoringReportRepository', () => {
	let repository: InstanceMonitoringReportRepository;

	beforeAll(async () => {
		await testModules.loadModules(['instance-reporting']);
		await testDb.init();
		repository = Container.get(InstanceMonitoringReportRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['InstanceMonitoringReport']);
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

		test('returns nothing once the report ran out of attempts, so it is not resent', async () => {
			const created = await repository.createPending(DATA_POINTS);
			await repository.markSkipped(created.id);

			await expect(repository.findTodaysPending(new Date())).resolves.toBeNull();
		});

		test('carries the last attempt time, so the wait between attempts survives a restart', async () => {
			const created = await repository.createPending(DATA_POINTS);
			const failedAt = new Date('2026-03-26T07:42:00.000Z');
			await repository.recordFailure(created.id, 'Network error', failedAt);

			const pending = await repository.findTodaysPending(new Date());

			expect(pending?.lastAttemptAt?.toISOString()).toBe(failedAt.toISOString());
		});
	});

	describe('hasSettledToday', () => {
		test('is false when no report was generated yet', async () => {
			await expect(repository.hasSettledToday(new Date())).resolves.toBe(false);
		});

		test("is false while today's report is still pending", async () => {
			await repository.createPending(DATA_POINTS);

			await expect(repository.hasSettledToday(new Date())).resolves.toBe(false);
		});

		test("is true once today's report was delivered", async () => {
			const created = await repository.createPending(DATA_POINTS);
			await repository.markDelivered(created.id, new Date());

			await expect(repository.hasSettledToday(new Date())).resolves.toBe(true);
		});

		test("is true once today's report ran out of attempts", async () => {
			// Otherwise the day would get a second report with a second budget.
			const created = await repository.createPending(DATA_POINTS);
			await repository.markSkipped(created.id);

			await expect(repository.hasSettledToday(new Date())).resolves.toBe(true);
		});

		test("ignores an earlier day's delivered report", async () => {
			const delivered = await repository.createPending(DATA_POINTS);
			await repository.markDelivered(delivered.id, new Date());

			const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

			await expect(repository.hasSettledToday(tomorrow)).resolves.toBe(false);
		});
	});

	describe('findLastCoveredDay', () => {
		function daily(date: string, value: number): InstanceMonitoringReport['dataPoints'] {
			return [{ kind: 'daily', name: 'billableExecutions', value, date }];
		}

		test('is null when nothing was ever delivered', async () => {
			await repository.createPending(DATA_POINTS);

			await expect(repository.findLastCoveredDay()).resolves.toBeNull();
		});

		test('returns the latest daily date a delivered report carried', async () => {
			const delivered = await repository.createPending([
				{ kind: 'daily', name: 'billableExecutions', value: 1, date: '2026-03-24' },
				{ kind: 'daily', name: 'billableExecutions', value: 2, date: REPORT_DATE },
			]);
			await repository.markDelivered(delivered.id, new Date());

			await expect(repository.findLastCoveredDay()).resolves.toBe(REPORT_DATE);
		});

		test('ignores failed reports, so their days are reported again', async () => {
			// The receiver answers 201 only once it saved the report, so a failure means
			// nothing was saved and the day is still owed. Reports pile up because the
			// scheduler creates a fresh one each day.
			const delivered = await repository.createPending(daily('2026-03-22', 1));
			await repository.markDelivered(delivered.id, new Date());

			const failed = await repository.createPending(daily('2026-03-23', 2));
			await repository.recordFailure(failed.id, 'Network error', new Date());
			await repository.createPending(daily('2026-03-24', 3));

			await expect(repository.findLastCoveredDay()).resolves.toBe('2026-03-22');
		});
	});

	describe('markDelivered', () => {
		test('stamps the delivery time, counts the attempt and clears any earlier error', async () => {
			const { id } = await repository.createPending(DATA_POINTS);
			await repository.recordFailure(id, 'Network error', new Date());
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

			await repository.recordFailure(id, 'Network error', new Date());
			await repository.recordFailure(id, 'Still down', new Date());

			await expect(repository.findOneByOrFail({ id })).resolves.toMatchObject({
				attempts: 2,
				lastError: 'Still down',
				deliveredAt: null,
			});
		});
	});
});
