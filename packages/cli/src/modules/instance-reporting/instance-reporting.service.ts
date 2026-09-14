import { Logger } from '@n8n/backend-common';
import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { LicenseMetricsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';
import { InsightsService } from '@/modules/insights/insights.service';
import { OwnershipService } from '@/services/ownership.service';

import type { InstanceReportDataPoint } from './database/entities/instance-monitoring-report';
import { InstanceMonitoringReportRepository } from './database/repositories/instance-monitoring-report.repository';
import { InstanceReportingConfig } from './instance-reporting.config';
import { INSTANCE_REPORTS_PATH } from './instance-reporting.constants';

/** A hung receiver must not hold a delivery open until the next report is due. */
const REQUEST_TIMEOUT_MS = 30 * Time.seconds.toMilliseconds;

/**
 * Attempts one report gets before the day is left to the next slot. The count
 * lives on the report row, so a restart resumes the budget instead of granting
 * a fresh one.
 */
const MAX_ATTEMPTS = 3;

/** How long to wait before re-attempting a delivery that failed. */
export const RETRY_DELAY_MS = 5 * Time.minutes.toMilliseconds;

/**
 * How many missed days one report may carry.
 *
 * Insights buckets a range of more than 30 days by week, which cannot fill a
 * daily point, so a longer gap is unrecoverable. The oldest days are dropped and
 * the report still ends at yesterday, rather than the instance retrying a window
 * it can never read.
 */
const MAX_BACKFILL_DAYS = 30;

/**
 * Measures and delivers one instance report. *When* that happens is
 * {@link InstanceReportingScheduler}'s concern.
 */
@Service()
export class InstanceReportingService {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly config: InstanceReportingConfig,
		private readonly reportRepository: InstanceMonitoringReportRepository,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly ownershipService: OwnershipService,
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
		private readonly logger: Logger,
		private readonly eventService: EventService,
		outboundHttp: OutboundHttp,
	) {
		this.logger = this.logger.scoped('instance-reporting');

		this.http = outboundHttp.requests({
			// The receiver is set by the operator and may legitimately be an internal
			// collector, so the URL is never user-controlled.
			useDefaultSsrfPolicy: 'unsafe',
			baseURL: this.config.instanceReportingBaseUrl.replace(/\/+$/, ''),
			// An unset token drops the header, so an unauthenticated receiver works.
			headers: () => ({
				authorization: this.config.instanceReportingAuthToken
					? `Bearer ${this.config.instanceReportingAuthToken}`
					: undefined,
			}),
			timeout: REQUEST_TIMEOUT_MS,
		});
	}

	/**
	 * Report billable executions as a daily data point for every unreported day,
	 * plus the instance's lifetime total as a cumulative one. Only a finished day
	 * has a final number, so the newest day reported is always the previous
	 * completed UTC one.
	 *
	 * Not sending a day twice is this instance's job — the receiver stores whatever
	 * arrives. The row is written before the request goes out and its id travels as
	 * `batchId`, so a redelivery reuses the row instead of measuring the day again,
	 * and only a delivered report crosses its days off.
	 *
	 * A retry resends today's pending report exactly as measured instead of taking
	 * fresh numbers. The cumulative point is a lifetime total sampled at this
	 * instance's report time, so its day-to-day difference only lines up with the
	 * daily point while every sample sits 24 hours apart; re-measuring hours later
	 * would stretch one interval and skew the whole series.
	 *
	 * @throws when delivery fails, so the scheduler retries with backoff.
	 */
	async sendReport(): Promise<void> {
		const now = new Date();
		let report = await this.reportRepository.findTodaysPending(now);

		// A crash between recording a failure and skipping the report leaves an
		// exhausted row pending, so the budget is re-checked before sending rather
		// than only after. Settling it here also ends the day for the scheduler.
		if (report && report.attempts >= MAX_ATTEMPTS) {
			await this.skip(report.id, report.attempts);
			return;
		}

		if (!report) {
			const days = await this.missedDays(now);
			if (days.length === 0) return;

			if (days.length > 1) {
				this.logger.info('Reporting days missed since the last delivered instance report', {
					days,
				});
			}

			report = await this.reportRepository.createPending(await this.collectDataPoints(days));
		}

		const payload = {
			instanceId: this.instanceSettings.instanceId,
			batchId: report.id,
			...(this.config.instanceReportingLabel ? { label: this.config.instanceReportingLabel } : {}),
			n8nVersion: N8N_VERSION,
			dataPoints: report.dataPoints,
		};

		try {
			const response = await this.http.request<unknown>({
				url: INSTANCE_REPORTS_PATH,
				method: 'POST',
				body: payload,
				json: true,
				returnFullResponse: true,
				// Inspect the status here rather than catching a generic request error.
				ignoreHttpStatusErrors: true,
				// A redirect would forward the auth token to whatever host it names.
				disableFollowRedirect: true,
			});

			if (response.statusCode === 409) {
				this.logger.error(
					'Instance report was rejected due to a report with the same instanceId and batchId already being recorded.',
					{
						batchId: report.id,
					},
				);
			} else if (response.statusCode !== 201) {
				// The endpoint answers 201 on success. Anything else, including a 2xx or a
				// 3xx (redirects are not followed), means the report did not land.
				throw new OperationalError(
					`Instance report was rejected with status ${response.statusCode}`,
				);
			}
			this.eventService.emit('instance-report-delivered');
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.eventService.emit('instance-report-failed');
			await this.reportRepository.recordFailure(report.id, message, new Date());

			// `recordFailure` incremented the count, so the in-memory row is one behind.
			if (report.attempts + 1 >= MAX_ATTEMPTS) {
				await this.skip(report.id, report.attempts + 1);
			}

			throw error;
		}

		await this.reportRepository.markDelivered(report.id, new Date());
		this.logger.debug('Sent instance report', { batchId: report.id });
	}

	/** Stop trying to deliver this report; the next one covers its days again. */
	private async skip(id: string, attempts: number): Promise<void> {
		await this.reportRepository.markSkipped(id);
		this.logger.error('Giving up on the instance report after repeated delivery failures', {
			batchId: id,
			attempts,
		});
	}

	/**
	 * How long the scheduler must wait before attempting today's report again, or
	 * `0` when it may attempt now.
	 *
	 * Derived from the report row, so the wait survives a restart. Without it, a
	 * crash loop would attempt at once every time and spend the whole budget in
	 * seconds.
	 */
	async msUntilRetryAllowed(now: Date): Promise<number> {
		const pending = await this.reportRepository.findTodaysPending(now);
		if (!pending?.lastAttemptAt) return 0;

		const elapsed = now.getTime() - pending.lastAttemptAt.getTime();

		return Math.max(0, RETRY_DELAY_MS - elapsed);
	}

	/**
	 * The UTC days this report must carry a daily point for, oldest first, ending
	 * yesterday. Empty when yesterday is already reported.
	 *
	 * A day the instance was down for is still unreported once it comes back, so
	 * the whole gap since the last delivered report is collected. Without that,
	 * downtime silently loses days from the daily series.
	 */
	private async missedDays(now: Date): Promise<string[]> {
		const lastCoveredDay = await this.reportRepository.findLastCoveredDay();
		const days: string[] = [];

		// No last covered day means this is the first report: send yesterday alone
		// rather than importing however much history insights happens to hold.
		for (let back = 1; back <= (lastCoveredDay ? MAX_BACKFILL_DAYS : 1); back++) {
			const day = utcDayBefore(now, back);
			if (lastCoveredDay && day <= lastCoveredDay) break;
			days.unshift(day);
		}

		return days;
	}

	/**
	 * One cumulative point plus one daily point for every day in `days`.
	 *
	 * Only the daily points are scoped to a day; the cumulative one is a running
	 * total with no date, so downtime produces extra daily points but never extra
	 * cumulative ones.
	 */
	private async collectDataPoints(days: string[]): Promise<InstanceReportDataPoint[]> {
		const startDate = new Date(`${days[0]}T00:00:00.000Z`);
		const endDate = new Date(
			new Date(`${days.at(-1)}T00:00:00.000Z`).getTime() + Time.days.toMilliseconds,
		);

		// Report instance-wide numbers, so read as the instance owner, whose global
		// role grants access to every workflow.
		const owner = await this.ownershipService.getInstanceOwner();

		const [byDay, { productionRootExecutions }] = await Promise.all([
			// Per day rather than one total for the range, since a report may cover
			// several days. A range of 1 to 30 days buckets by day; see MAX_BACKFILL_DAYS.
			this.insightsService.getInsightsByTime({
				user: owner,
				startDate,
				endDate,
				timeZone: 'UTC',
			}),
			// Same source as the `productionRootExecutions` license metric, so the
			// reported total matches what the license server sees.
			this.licenseMetricsRepository.getLicenseRenewalMetrics(),
		]);

		const totals = new Map(byDay.map((row) => [row.date.slice(0, 10), row.values.total ?? 0]));

		return [
			{ kind: 'cumulative', name: 'billableExecutions', value: productionRootExecutions },
			// A day with no executions returns no row, so fill it in as 0. Left out,
			// the receiver cannot tell "no executions" from "never reported".
			...days.map((date) => ({
				kind: 'daily' as const,
				name: 'billableExecutions',
				value: totals.get(date) ?? 0,
				date,
			})),
		];
	}
}

/** The UTC calendar day `count` days before `instant`, as `YYYY-MM-DD`. */
function utcDayBefore(instant: Date, count: number): string {
	return new Date(instant.getTime() - count * Time.days.toMilliseconds).toISOString().slice(0, 10);
}
