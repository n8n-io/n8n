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

	async function createOn(date: string | Date, dataPoints = DATA_POINTS) {
		const report = await repository.createPending(dataPoints, new Date(date));
		if (!report) throw new Error(`A report was already created on the day of ${String(date)}`);

		return report;
	}

	describe('createPending', () => {
		test('records the measurement with a generated id, undelivered', async () => {
			const report = await createOn(new Date());

			expect(report.id).toEqual(expect.any(String));
			expect(report.deliveredAt).toBeNull();
			expect(report.attempts).toBe(0);
			expect(report.createdAt).toEqual(expect.any(Date));
			await expect(repository.findOneByOrFail({ id: report.id })).resolves.toMatchObject({
				dataPoints: DATA_POINTS,
			});
		});

		test.each([
			['2026-03-25T00:00:00.000Z', '2026-03-25'],
			['2026-03-25T23:59:59.999Z', '2026-03-25'],
			['2026-03-26T01:30:00.000+02:00', '2026-03-25'],
			['2026-03-25T20:30:00.000-05:00', '2026-03-26'],
		])('stores the UTC day of %s as the report date %s', async (now, reportDate) => {
			const { id } = await createOn(now);

			await expect(repository.findOneByOrFail({ id })).resolves.toMatchObject({ reportDate });
		});

		test('returns null for a second report on the same UTC day and keeps the first', async () => {
			const first = await createOn('2026-03-25T07:42:00.000Z');

			await expect(
				repository.createPending(DATA_POINTS, new Date('2026-03-25T23:59:00.000Z')),
			).resolves.toBeNull();
			await expect(repository.find()).resolves.toEqual([expect.objectContaining({ id: first.id })]);
		});

		test('creates a report on the next UTC day', async () => {
			await createOn('2026-03-25T23:59:00.000Z');

			await createOn('2026-03-26T00:00:00.000Z');

			await expect(repository.count()).resolves.toBe(2);
		});
	});

	describe('findPending', () => {
		async function createdOn(date: string) {
			const report = await createOn(date);
			await repository.update({ id: report.id }, { createdAt: new Date(date) });

			return report;
		}

		test('returns nothing when no report was generated yet', async () => {
			await expect(repository.findPending()).resolves.toBeNull();
		});

		test('returns the pending report with the numbers it measured', async () => {
			const created = await createOn(new Date());

			const pending = await repository.findPending();

			expect(pending?.id).toBe(created.id);
			expect(pending?.status).toBe('pending');
			expect(pending?.dataPoints).toEqual(DATA_POINTS);
		});

		test('returns nothing once the newest report is delivered', async () => {
			const created = await createOn(new Date());
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
			const created = await createOn(new Date());
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
			await createOn(new Date());

			await expect(repository.hasSettledToday(new Date())).resolves.toBe(false);
		});

		test("is true once today's report was delivered", async () => {
			const created = await createOn(new Date());
			await repository.markDelivered(created.id, new Date());

			await expect(repository.hasSettledToday(new Date())).resolves.toBe(true);
		});

		test("is true once today's report ran out of attempts", async () => {
			// Otherwise the day would get a second report with a second budget.
			const created = await createOn(new Date());
			await repository.markSkipped(created.id);

			await expect(repository.hasSettledToday(new Date())).resolves.toBe(true);
		});

		test("ignores an earlier day's delivered report", async () => {
			const delivered = await createOn(new Date());
			await repository.markDelivered(delivered.id, new Date());

			const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

			await expect(repository.hasSettledToday(tomorrow)).resolves.toBe(false);
		});

		test('reads the UTC day the report was created on', async () => {
			const delivered = await createOn('2026-03-25T23:59:00.000Z');
			await repository.markDelivered(delivered.id, new Date());

			await expect(repository.hasSettledToday(new Date('2026-03-25T00:00:00.000Z'))).resolves.toBe(
				true,
			);
			await expect(repository.hasSettledToday(new Date('2026-03-26T00:01:00.000Z'))).resolves.toBe(
				false,
			);
		});
	});

	describe('findLastCoveredDay', () => {
		function daily(date: string, value: number): InstanceMonitoringReport['dataPoints'] {
			return [{ kind: 'daily', name: 'billableExecutions', value, date }];
		}

		test('is null when nothing was ever delivered', async () => {
			await createOn(new Date());

			await expect(repository.findLastCoveredDay()).resolves.toBeNull();
		});

		test('returns the latest daily date a delivered report carried', async () => {
			const delivered = await createOn(new Date(), [
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
			const delivered = await createOn('2026-03-23T07:42:00.000Z', daily('2026-03-22', 1));
			await repository.markDelivered(delivered.id, new Date());

			const failed = await createOn('2026-03-24T07:42:00.000Z', daily('2026-03-23', 2));
			await repository.recordFailure(failed.id, 'Network error', new Date());
			await createOn('2026-03-25T07:42:00.000Z', daily('2026-03-24', 3));

			await expect(repository.findLastCoveredDay()).resolves.toBe('2026-03-22');
		});
	});

	describe('findLastDeliveryTime', () => {
		test('is null when nothing was ever delivered', async () => {
			await createOn(new Date());

			await expect(repository.findLastDeliveryTime()).resolves.toBeNull();
		});

		test('returns the latest delivery time across delivered reports', async () => {
			const earlier = await createOn('2026-03-24T07:41:00.000Z');
			await repository.markDelivered(earlier.id, new Date('2026-03-24T07:42:00.000Z'));

			const latest = await createOn('2026-03-25T07:42:00.000Z');
			const latestDeliveredAt = new Date('2026-03-25T07:42:13.000Z');
			await repository.markDelivered(latest.id, latestDeliveredAt);

			const lastDelivery = await repository.findLastDeliveryTime();

			expect(lastDelivery?.toISOString()).toBe(latestDeliveredAt.toISOString());
		});

		test('ignores reports that never reached the receiver', async () => {
			const delivered = await createOn('2026-03-24T07:41:00.000Z');
			const deliveredAt = new Date('2026-03-24T07:42:00.000Z');
			await repository.markDelivered(delivered.id, deliveredAt);

			const failed = await createOn('2026-03-25T07:42:00.000Z');
			await repository.recordFailure(failed.id, 'Network error', new Date());
			const skipped = await createOn('2026-03-26T07:42:00.000Z');
			await repository.markSkipped(skipped.id);
			await createOn('2026-03-27T07:42:00.000Z');

			const lastDelivery = await repository.findLastDeliveryTime();

			expect(lastDelivery?.toISOString()).toBe(deliveredAt.toISOString());
		});
	});

	describe('markSkipped', () => {
		test('settles a pending report as skipped', async () => {
			const { id } = await createOn(new Date());

			await repository.markSkipped(id);

			await expect(repository.findOneByOrFail({ id })).resolves.toMatchObject({
				status: 'skipped_after_max_retries',
			});
		});

		test('leaves a report delivered when another process delivered it first', async () => {
			const { id } = await createOn(new Date());
			await repository.markDelivered(id, new Date());

			await repository.markSkipped(id);

			await expect(repository.findOneByOrFail({ id })).resolves.toMatchObject({
				status: 'delivered',
			});
		});
	});

	describe('markDelivered', () => {
		test('stamps the delivery time, counts the attempt and clears any earlier error', async () => {
			const { id } = await createOn(new Date());
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
			const { id } = await createOn(new Date());

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
