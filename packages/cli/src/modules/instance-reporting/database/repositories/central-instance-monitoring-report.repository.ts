import { Service } from '@n8n/di';
import { DataSource, IsNull, MoreThanOrEqual, Not, Repository } from '@n8n/typeorm';

import type { InstanceReportDataPoint } from '../entities/central-instance-monitoring-report';
import { CentralInstanceMonitoringReport } from '../entities/central-instance-monitoring-report';

@Service()
export class CentralInstanceMonitoringReportRepository extends Repository<CentralInstanceMonitoringReport> {
	constructor(dataSource: DataSource) {
		super(CentralInstanceMonitoringReport, dataSource.manager);
	}

	/**
	 * Today's report, if one was already generated and never reached the receiver.
	 *
	 * Resending it — same `batchId`, same data points — is what keeps a retry from
	 * re-measuring: the metrics were sampled at this instance's report time, and the
	 * cumulative series is only comparable day to day while that sampling interval
	 * stays a fixed 24 hours. It also lets a receiver that accepted the first
	 * attempt (and only lost the response) deduplicate instead of double-counting.
	 *
	 * Scoped to `now`'s UTC day on purpose: an older undelivered report measured a
	 * different day, so it must not stand in for today's. It stays as it is, a
	 * record of a report that never landed, for a backfill to pick up.
	 */
	async findTodaysPending(now: Date): Promise<CentralInstanceMonitoringReport | null> {
		return await this.findOne({
			where: { deliveredAt: IsNull(), createdAt: MoreThanOrEqual(startOfUtcDay(now)) },
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Whether a report generated on `now`'s UTC day already reached the receiver.
	 *
	 * This, rather than the fact that a timer fired, is what decides whether there
	 * is anything to do: a restart or a leadership handover that straddles the
	 * report time still finds the day unreported, and a duplicate fire finds it
	 * done.
	 */
	async hasDeliveredToday(now: Date): Promise<boolean> {
		return await this.existsBy({
			createdAt: MoreThanOrEqual(startOfUtcDay(now)),
			deliveredAt: Not(IsNull()),
		});
	}

	/**
	 * Record a freshly measured report, before any attempt to deliver it. Written
	 * with its data points rather than filled in afterwards, so a row always carries
	 * the measurement it stands for.
	 */
	async createPending(
		dataPoints: InstanceReportDataPoint[],
	): Promise<CentralInstanceMonitoringReport> {
		return await this.save(this.create({ dataPoints, deliveredAt: null }));
	}

	async markDelivered(id: string, deliveredAt: Date): Promise<void> {
		await this.increment({ id }, 'attempts', 1);
		await this.update({ id }, { deliveredAt, lastError: null });
	}

	async recordFailure(id: string, error: string): Promise<void> {
		await this.increment({ id }, 'attempts', 1);
		await this.update({ id }, { lastError: error });
	}
}

function startOfUtcDay(instant: Date): Date {
	return new Date(
		Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate(), 0, 0, 0, 0),
	);
}
