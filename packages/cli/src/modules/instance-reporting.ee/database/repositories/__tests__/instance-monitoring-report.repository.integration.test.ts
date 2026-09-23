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

	describe('findPending', () => {
		async function createdOn(date: string) {
			const report = await repository.createPending(DATA_POINTS);
			await repository.update({ id: report.id }, { createdAt: new Date(date) });

			return report;
		}

		test('returns nothing when no report was generated yet', async () => {
			await expect(repository.findPending()).resolves.toBeNull();
		});

		test('returns the pending report with the numbers it measured', async () => {
			const created = await repository.createPending(DATA_POINTS);

			const pending = await repository.findPending();

			expect(pending?.id).toBe(created.id);
			expect(pending?.status).toBe('pending');
			expect(pending?.dataPoints).toEqual(DATA_POINTS);
		});

		test('returns nothing once the newest report is delivered', async () => {
			const created = await repository.createPending(DATA_POINTS);
			await repository.markDelivered(created.id, new Date());

			await expect(repository.findPending()).resolves.toBeNull();
		});

		test('returns nothing when an older pending row sits under a newer delivered one', async () => {
			// Earlier versions left a failed report pending for good. The newer report
			// already covers that orphan's days, so a resend would report them two
			// times. Filtering on `status` in the query would return the orphan here.
			await createdOn('2026-03-20T07:42:00.000Z');
			const newer = await createdOn('2026-03-25T07:42:00.000Z');
			await repository.markDelivered(newer.id, new Date());

			await expect(repository.findPending()).resolves.toBeNull();
		});

		test('returns the newest row when it is pending, ignoring an older delivered one', async () => {
			const older = await createdOn('2026-03-20T07:42:00.000Z');
			await repository.markDelivered(older.id, new Date());
			const newer = await createdOn('2026-03-25T07:42:00.000Z');

			await expect(repository.findPending()).resolves.toMatchObject({ id: newer.id });
		});

		test('carries the last attempt time, so the wait between attempts survives a restart', async () => {
			const created = await repository.createPending(DATA_POINTS);
			const failedAt = new Date('2026-03-26T07:42:00.000Z');
			await repository.recordFailure(created.id, 'Network error', failedAt);

			const pending = await repository.findPending();

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

	describe('findLastDeliveryTime', () => {
		test('is null when nothing was ever delivered', async () => {
			await repository.createPending(DATA_POINTS);

			await expect(repository.findLastDeliveryTime()).resolves.toBeNull();
		});

		test('returns the latest delivery time across delivered reports', async () => {
			const earlier = await repository.createPending(DATA_POINTS);
			await repository.markDelivered(earlier.id, new Date('2026-03-24T07:42:00.000Z'));

			const latest = await repository.createPending(DATA_POINTS);
			const latestDeliveredAt = new Date('2026-03-25T07:42:13.000Z');
			await repository.markDelivered(latest.id, latestDeliveredAt);

			const lastDelivery = await repository.findLastDeliveryTime();

			expect(lastDelivery?.toISOString()).toBe(latestDeliveredAt.toISOString());
		});

		test('ignores reports that never reached the receiver', async () => {
			const delivered = await repository.createPending(DATA_POINTS);
			const deliveredAt = new Date('2026-03-24T07:42:00.000Z');
			await repository.markDelivered(delivered.id, deliveredAt);

			const failed = await repository.createPending(DATA_POINTS);
			await repository.recordFailure(failed.id, 'Network error', new Date());
			const skipped = await repository.createPending(DATA_POINTS);
			await repository.markSkipped(skipped.id);
			await repository.createPending(DATA_POINTS);

			const lastDelivery = await repository.findLastDeliveryTime();

			expect(lastDelivery?.toISOString()).toBe(deliveredAt.toISOString());
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
