import { dbNowLiteral, isUniqueConstraintError, parseDbTime } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not, Repository } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import type { InstanceReportDataPoint } from '../entities/instance-monitoring-report';
import { InstanceMonitoringReport } from '../entities/instance-monitoring-report';

@Service()
export class InstanceMonitoringReportRepository extends Repository<InstanceMonitoringReport> {
	constructor(dataSource: DataSource) {
		super(InstanceMonitoringReport, dataSource.manager);
	}

	/**
	 * The active report, or `null` when there is nothing to resume.
	 * It is the newest row, and only if it is `pending` or `sending`.
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

		return latest?.status === 'pending' || latest?.status === 'sending' ? latest : null;
	}

	/** Use one clock for claim age and retry delays across mains. */
	async readDbNow(): Promise<Date> {
		const isPostgres = this.manager.connection.options.type === 'postgres';
		const [row]: Array<{ dbNow: Date | string }> = await this.query(
			`SELECT ${dbNowLiteral(isPostgres)} AS "dbNow"`,
		);
		return parseDbTime(row.dbNow);
	}

	/** Return the claim timestamp. Failure writes must match this claim. */
	async claimForSend(id: string): Promise<Date | null> {
		const startedAt = await this.readDbNow();
		const result = await this.update(
			{ id, status: 'pending' },
			{ status: 'sending', lastAttemptAt: startedAt },
		);
		return result.affected === 1 ? startedAt : null;
	}

	/** Release a claim left by a stopped main. A newer claim stays in place. */
	async releaseStaleSend(id: string, startedAt: Date | null): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'sending', lastAttemptAt: startedAt ?? IsNull() },
			{ status: 'pending' },
		);
		return result.affected === 1;
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
			reportDate: utcDay(now),
			status: In(['delivered', 'skipped_after_max_retries']),
		});
	}

	/**
	 * Record a freshly measured report, with its data points, before any attempt
	 * to deliver it. A row therefore always carries the measurement it stands for.
	 *
	 * `null` when a report was already created on `now`'s UTC day.
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
			if (isUniqueConstraintError(error)) return null;
			throw error;
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

	/** An acceptance confirms delivery even after another main reclaims the report. */
	async markDelivered(id: string, deliveredAt: Date): Promise<boolean> {
		const result = await this.update(
			{ id, status: Not('delivered') },
			{
				attempts: () => 'attempts + 1',
				status: 'delivered',
				deliveredAt,
				lastAttemptAt: deliveredAt,
				lastError: null,
			},
		);
		return result.affected === 1;
	}

	async recordFailure(
		id: string,
		claimedAt: Date,
		error: string,
		failedAt: Date,
	): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'sending', lastAttemptAt: claimedAt },
			{
				attempts: () => 'attempts + 1',
				status: 'pending',
				lastAttemptAt: failedAt,
				lastError: error,
			},
		);
		return result.affected === 1;
	}

	/**
	 * Stop trying to deliver this report. Its days are covered by the next one.
	 * Already delivered report stays delivered.
	 */
	async markSkipped(id: string): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'pending' },
			{ status: 'skipped_after_max_retries' },
		);
		return result.affected === 1;
	}
}

function utcDay(instant: Date): string {
	return instant.toISOString().slice(0, 10);
}
