import { isUniqueConstraintError } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, Not, Repository } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import type { InstanceReportDataPoint } from '../entities/instance-monitoring-report';
import { InstanceMonitoringReport } from '../entities/instance-monitoring-report';

@Service()
export class InstanceMonitoringReportRepository extends Repository<InstanceMonitoringReport> {
	constructor(dataSource: DataSource) {
		super(InstanceMonitoringReport, dataSource.manager);
	}

	/**
	 * The report a retry may resume, or `null` when there is nothing to resume.
	 * It is the newest row, and only if that row is still `pending`.
	 *
	 * At most one report is genuinely pending: the scheduler settles a stale row
	 * before it creates the next one. But earlier versions left a failed report
	 * pending for good, so an instance can still hold an old `pending` row below
	 * a newer `delivered` one. That row is an orphan — the newer report already
	 * covers its days, and a resend would report those days two times.
	 *
	 * So this reads the newest row of any status and then checks that status. It
	 * must not filter on `status` in the query.
	 *
	 * `id` breaks a `createdAt` tie so the result is stable. A tie needs two
	 * reports in the same millisecond, which the once-a-day cadence never makes.
	 */
	async findPending(): Promise<InstanceMonitoringReport | null> {
		const [latest] = await this.find({ order: { createdAt: 'DESC', id: 'DESC' }, take: 1 });

		return latest?.status === 'pending' ? latest : null;
	}

	/**
	 * Whether `now`'s UTC day is finished with, either because its report was
	 * delivered or because it ran out of attempts.
	 *
	 * This, rather than the fact that a timer fired, is what decides whether there
	 * is anything to do: a restart or a leadership handover that straddles the
	 * report time still finds the day unreported, and a duplicate fire finds it
	 * done.
	 *
	 * A skipped day counts as settled, so the instance stops for the day instead
	 * of generating a second report with a second budget. The day itself is not
	 * lost — only a delivered report crosses a day off.
	 */
	async hasSettledToday(now: Date): Promise<boolean> {
		return await this.existsBy({ reportDate: utcDay(now), status: Not('pending') });
	}

	/**
	 * Record a freshly measured report, with its data points, before any attempt
	 * to deliver it. A row therefore always carries the measurement it stands for.
	 *
	 * When a report was already created on `now`'s UTC day, returns that one while
	 * it is still pending, and `null` once it has settled.
	 */
	async createPending(
		dataPoints: InstanceReportDataPoint[],
		now: Date,
	): Promise<InstanceMonitoringReport | null> {
		try {
			return await this.save(
				this.create({
					id: uuid(),
					reportDate: utcDay(now),
					dataPoints,
					status: 'pending',
					deliveredAt: null,
				}),
			);
		} catch (error) {
			if (!isUniqueConstraintError(error)) throw error;

			return await this.findOneBy({ reportDate: utcDay(now), status: 'pending' });
		}
	}

	/**
	 * The latest day the receiver has accepted, as `YYYY-MM-DD`, or `null` when
	 * nothing was ever accepted. Inclusive: the day named here is reported, so
	 * the next report starts at the day after it.
	 *
	 * Only a delivered report counts, and the receiver answers 201 only once it
	 * has saved the report. So a day whose report failed, for any reason, is
	 * still owed and the next report covers it again. That is also why the same
	 * day may go out under a second `batchId`: nothing was saved the first time.
	 *
	 * The maximum is taken over every delivered row instead of the newest one, so
	 * the answer does not depend on `createdAt` being unique. The table gains one
	 * row a day and only `dataPoints` is selected, so the scan stays cheap.
	 */
	async findLastCoveredDay(): Promise<string | null> {
		const delivered = await this.find({ where: { status: 'delivered' }, select: ['dataPoints'] });
		const days = delivered.flatMap((report) =>
			report.dataPoints.flatMap((point) => (point.kind === 'daily' ? [point.date] : [])),
		);

		return days.length ? days.reduce((a, b) => (a > b ? a : b)) : null;
	}

	/**
	 * When the receiver last accepted a report, or `null` when it never did.
	 */
	async findLastDeliveryTime(): Promise<Date | null> {
		const report = await this.findOne({
			where: { status: 'delivered', deliveredAt: Not(IsNull()) },
			order: { deliveredAt: 'DESC' },
			select: ['deliveredAt'],
		});

		return report?.deliveredAt ?? null;
	}

	async markDelivered(id: string, deliveredAt: Date): Promise<void> {
		await this.increment({ id }, 'attempts', 1);
		await this.update(
			{ id },
			{ status: 'delivered', deliveredAt, lastAttemptAt: deliveredAt, lastError: null },
		);
	}

	async recordFailure(id: string, error: string, failedAt: Date): Promise<void> {
		await this.increment({ id }, 'attempts', 1);
		await this.update({ id }, { lastAttemptAt: failedAt, lastError: error });
	}

	/** Stop trying to deliver this report. Its days are covered by the next one. */
	async markSkipped(id: string): Promise<void> {
		await this.update({ id }, { status: 'skipped_after_max_retries' });
	}
}

function utcDay(instant: Date): string {
	return instant.toISOString().slice(0, 10);
}
