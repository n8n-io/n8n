import { Service } from '@n8n/di';
import { DataSource, MoreThanOrEqual, Not, Repository } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import type { InstanceReportDataPoint } from '../entities/instance-monitoring-report';
import { InstanceMonitoringReport } from '../entities/instance-monitoring-report';

@Service()
export class InstanceMonitoringReportRepository extends Repository<InstanceMonitoringReport> {
	constructor(dataSource: DataSource) {
		super(InstanceMonitoringReport, dataSource.manager);
	}

	/**
	 * Today's report, if one was already generated and never reached the receiver.
	 *
	 * Resending it — same `batchId`, same data points — is what keeps a retry from
	 * re-measuring: the cumulative series is only comparable day to day while its
	 * sampling interval stays a fixed 24 hours.
	 *
	 * Scoped to `now`'s UTC day on purpose: an older undelivered report measured a
	 * different day, so it must not stand in for today's. It stays as it is, a
	 * record of a report that never landed, and its days are covered again by the
	 * next report.
	 *
	 * A report that ran out of attempts is not pending, so it is never resent.
	 */
	async findTodaysPending(now: Date): Promise<InstanceMonitoringReport | null> {
		return await this.findOne({
			where: { status: 'pending', createdAt: MoreThanOrEqual(startOfUtcDay(now)) },
			order: { createdAt: 'DESC' },
		});
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
		return await this.existsBy({
			createdAt: MoreThanOrEqual(startOfUtcDay(now)),
			status: Not('pending'),
		});
	}

	/**
	 * Record a freshly measured report, with its data points, before any attempt
	 * to deliver it. A row therefore always carries the measurement it stands for.
	 */
	async createPending(dataPoints: InstanceReportDataPoint[]): Promise<InstanceMonitoringReport> {
		return await this.save(
			this.create({ id: uuid(), dataPoints, status: 'pending', deliveredAt: null }),
		);
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

function startOfUtcDay(instant: Date): Date {
	return new Date(
		Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate(), 0, 0, 0, 0),
	);
}
