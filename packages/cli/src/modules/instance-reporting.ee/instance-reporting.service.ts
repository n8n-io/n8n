import { Logger } from '@n8n/backend-common';
import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { LicenseMetricsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { InsightsConfig } from '@/modules/insights/insights.config';
import { InsightsService } from '@/modules/insights/insights.service';

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

/** The receiver rejects the payload itself, which a pending report resends unchanged. */
const PAYLOAD_REJECTED_STATUSES = new Set([400, 413]);

class InstanceReportRejectedError extends OperationalError {
	constructor(statusCode: number, body: unknown) {
		const reason = isRecord(body) && typeof body.message === 'string' ? `: ${body.message}` : '';
		super(`Instance report was rejected with status ${statusCode}${reason}`);
	}
}

type SkipReason = 'max-retries' | 'slot-passed' | 'rejected';

const SKIP_MESSAGES: Record<SkipReason, string> = {
	'max-retries': 'Giving up on the instance report after repeated delivery failures',
	'slot-passed': 'Giving up on the instance report because its slot has passed',
	rejected: 'Giving up on the instance report because the receiver rejected its payload',
};

/** How long to wait before re-attempting a delivery that failed. */
export const RETRY_DELAY_MS = 5 * Time.minutes.toMilliseconds;

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
		private readonly insightsConfig: InsightsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
		private readonly license: License,
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
			// An unset token drops the header; the license certificate is the credential then.
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
	 * A retry resends the pending report exactly as measured instead of taking
	 * fresh numbers. The cumulative point is a lifetime total sampled at this
	 * instance's report time, so its day-to-day difference only lines up with the
	 * daily point while every sample sits 24 hours apart; re-measuring hours later
	 * would stretch one interval and skew the whole series.
	 *
	 * The credential is the license certificate, sent in the body, unless a
	 * bearer token is configured; then the token goes in the header and the
	 * certificate is not sent at all.
	 *
	 * A 400 or 413 skips the report at once, since a resend carries the same payload.
	 *
	 * @throws when delivery fails and a retry may succeed, so the scheduler retries with backoff.
	 */
	async sendReport(): Promise<void> {
		const licenseCert = this.config.instanceReportingAuthToken
			? undefined
			: await this.license.loadCertStr();
		if (licenseCert === '') {
			this.logger.warn(
				'Skipping the instance report because this instance has no license certificate.',
			);
			return;
		}

		const now = new Date();
		let report = await this.reportRepository.findPending();

		// A crash between recording a failure and skipping the report leaves an
		// exhausted row pending, so the budget is re-checked before sending rather
		// than only after. Settling it here also ends the day for the scheduler.
		if (report && report.attempts >= MAX_ATTEMPTS) {
			await this.skip(report.id, report.attempts, 'max-retries', report.lastError);
			return;
		}

		if (!report) {
			const days = await this.missedDays(now);
			if (days.length === 0) return;

			report = await this.reportRepository.createPending(await this.collectDataPoints(days));
		}

		const payload = {
			instanceId: this.instanceSettings.instanceId,
			batchId: report.id,
			...(this.config.instanceReportingLabel ? { label: this.config.instanceReportingLabel } : {}),
			n8nVersion: N8N_VERSION,
			dataPoints: report.dataPoints,
			...(licenseCert ? { licenseCert } : {}),
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
				// A redirect would forward the credential to whatever host it names.
				disableFollowRedirect: true,
			});

			if (response.statusCode === 409) {
				this.logger.error(
					'Instance report was rejected due to a report with the same instanceId and batchId already being recorded.',
					{
						batchId: report.id,
					},
				);
			} else if (PAYLOAD_REJECTED_STATUSES.has(response.statusCode)) {
				throw new InstanceReportRejectedError(response.statusCode, response.body);
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
			const attempts = report.attempts + 1;

			if (error instanceof InstanceReportRejectedError) {
				await this.skip(report.id, attempts, 'rejected', message);
				return;
			}

			if (attempts >= MAX_ATTEMPTS) {
				await this.skip(report.id, attempts, 'max-retries', message);
			}

			throw error;
		}

		await this.reportRepository.markDelivered(report.id, new Date());
		this.logger.debug('Sent instance report', { batchId: report.id });
	}

	/** Stop trying to deliver this report; the next one covers its days again. */
	async skip(
		id: string,
		attempts: number,
		reason: SkipReason,
		lastError: string | null,
	): Promise<void> {
		await this.reportRepository.markSkipped(id);

		this.logger.error(SKIP_MESSAGES[reason], { batchId: id, attempts, lastError });
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
		const pending = await this.reportRepository.findPending();
		if (!pending?.lastAttemptAt) return 0;

		const elapsed = now.getTime() - pending.lastAttemptAt.getTime();

		return Math.max(0, RETRY_DELAY_MS - elapsed);
	}

	/**
	 * The UTC days this report must carry a daily point for, oldest first, ending
	 * yesterday. Empty when yesterday is already reported.
	 *
	 * Every day after the last delivered one is still owed, whatever happened to
	 * the reports in between, so neither downtime nor skipped reports lose days
	 * from the daily series. A first report carries the history insights holds.
	 */
	private async missedDays(now: Date): Promise<string[]> {
		const yesterday = utcDayBefore(now, 1);
		const lastCoveredDay = await this.reportRepository.findLastCoveredDay();
		if (lastCoveredDay && lastCoveredDay >= yesterday) return [];

		const firstDay = minDay(await this.firstOwedDay(lastCoveredDay, yesterday), yesterday);
		// Compaction folds days older than this threshold into weekly totals, which
		// have no per-day value. One day of margin, since Postgres dates that
		// threshold in the session's time zone rather than in UTC.
		const oldestAllowedDay = utcDayBefore(
			now,
			Math.max(1, this.insightsConfig.compactionDailyToWeeklyThresholdDays - 1),
		);

		const days: string[] = [];
		for (let day = maxDay(firstDay, oldestAllowedDay); day <= yesterday; day = addUtcDays(day, 1)) {
			days.push(day);
		}

		if (days.length > 1) {
			this.logger.info(
				lastCoveredDay
					? 'Reporting days missed since the last delivered instance report'
					: 'Reporting the insights history, since no instance report was delivered yet',
				{ firstDay: days[0], lastDay: days.at(-1), count: days.length },
			);
		}

		return days;
	}

	/**
	 * The oldest day the next report owes: the day after the last delivered one,
	 * but never before the first insights data, since nothing before it shows
	 * that insights was collecting.
	 */
	private async firstOwedDay(lastCoveredDay: string | null, yesterday: string): Promise<string> {
		const dayAfterCovered = lastCoveredDay ? addUtcDays(lastCoveredDay, 1) : null;

		// Only yesterday is owed, which is the everyday case: skip the history read.
		if (dayAfterCovered === yesterday) return yesterday;

		const earliest = await this.insightsService.getEarliestDataDate();
		const dataStart = earliest ? earliest.toISOString().slice(0, 10) : null;

		// Without any data, a first report still carries yesterday, so that a new
		// instance shows up on the receiver.
		return maxDay(dayAfterCovered ?? dataStart ?? yesterday, dataStart);
	}

	/**
	 * One cumulative point plus one daily point for every day in `days`.
	 *
	 * Only the daily points are scoped to a day; the cumulative one is a running
	 * total with no date, so downtime produces extra daily points but never extra
	 * cumulative ones.
	 */
	private async collectDataPoints(days: string[]): Promise<InstanceReportDataPoint[]> {
		const [totals, { productionRootExecutions }] = await Promise.all([
			this.insightsService.getDailyExecutionTotals({
				startDate: new Date(`${days[0]}T00:00:00.000Z`),
				endDate: new Date(`${days[days.length - 1]}T00:00:00.000Z`),
			}),
			// Same source as the `productionRootExecutions` license metric, so the
			// reported total matches what the license server sees.
			this.licenseMetricsRepository.getLicenseRenewalMetrics(),
		]);

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

/** The UTC calendar day `count` days after `day`, as `YYYY-MM-DD`. */
function addUtcDays(day: string, count: number): string {
	return utcDayBefore(new Date(`${day}T00:00:00.000Z`), -count);
}

/** The later of two `YYYY-MM-DD` days; `null` counts as no bound. */
function maxDay(day: string, other: string | null): string {
	return other && other > day ? other : day;
}

/** The earlier of two `YYYY-MM-DD` days. */
function minDay(day: string, other: string): string {
	return other < day ? other : day;
}
