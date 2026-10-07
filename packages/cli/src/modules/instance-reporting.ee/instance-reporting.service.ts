import { Logger } from '@n8n/backend-common';
import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { EventService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { LicenseMetricsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { License } from '@/license';
import { InsightsService } from '@n8n/backend-module-insights';
import { InsightsConfig } from '@n8n/backend-module-insights/config';

import type {
	InstanceMonitoringReport,
	InstanceReportDataPoint,
} from './database/entities/instance-monitoring-report';
import { InstanceMonitoringReportRepository } from './database/repositories/instance-monitoring-report.repository';
import { InstanceReportingSettingsService } from './instance-reporting-settings.service';
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

/** How long a pending report waits after a failed attempt before the next one. */
const RETRY_DELAY_MS = 5 * Time.minutes.toMilliseconds;

/** Longer than the HTTP timeout, so a stopped main does not hold a report forever. */
const SEND_CLAIM_TIMEOUT_MS = 2 * Time.minutes.toMilliseconds;

/**
 * How long yesterday's slot stays due. Longer than the pass interval, so a slot
 * late in the UTC day is still sent after midnight.
 */
const SLOT_GRACE_MS = Time.hours.toMilliseconds;

/** The receiver rejects the payload itself, which a pending report resends unchanged. */
const PAYLOAD_REJECTED_STATUSES = new Set([400, 413]);

class InstanceReportRejectedError extends OperationalError {
	constructor(statusCode: number, body: unknown) {
		const reason = isRecord(body) && typeof body.message === 'string' ? `: ${body.message}` : '';
		super(`Instance report was rejected with status ${statusCode}${reason}`);
	}
}

type SkipReason = 'max-retries' | 'slot-passed' | 'rejected';

export interface DueReportWork {
	expiredReport: InstanceMonitoringReport | null;
	reportDue: boolean;
	/** The slot a new report is created for, or `null` when no slot is due. */
	slot: Date | null;
}

const SKIP_MESSAGES: Record<SkipReason, string> = {
	'max-retries': 'Giving up on the instance report after repeated delivery failures',
	'slot-passed': 'Giving up on the instance report because its slot has passed',
	rejected: 'Giving up on the instance report because the receiver rejected its payload',
};

/**
 * Measures and delivers one instance report. How often a pass runs is
 * {@link InstanceReportingTask}'s concern.
 */
@Service()
export class InstanceReportingService {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly config: InstanceReportingConfig,
		private readonly reportRepository: InstanceMonitoringReportRepository,
		private readonly settingsService: InstanceReportingSettingsService,
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
	 * The work due at `now`, from the report time and the stored report rows.
	 * A pending report inside its slot is due once its retry delay has elapsed.
	 * A new slot expires the pending report, even during the retry delay. Then a
	 * report is due for the latest slot at or before `now`, unless the day of
	 * that slot is settled. Yesterday's slot counts only within its grace.
	 */
	async findDueWork(now: Date): Promise<DueReportWork> {
		const reportTime = await this.settingsService.getReportTime();
		let pending = await this.reportRepository.findPending();
		const retryNow = pending ? await this.reportRepository.readDbNow() : now;
		if (pending?.status === 'sending') {
			if (
				pending.lastAttemptAt === null ||
				retryNow.getTime() - pending.lastAttemptAt.getTime() >= SEND_CLAIM_TIMEOUT_MS
			) {
				await this.reportRepository.releaseStaleSend(pending.id, pending.lastAttemptAt);
				pending = await this.reportRepository.findPending();
			}
		}

		let work: DueReportWork = { expiredReport: null, reportDue: false, slot: null };
		if (pending?.status !== 'sending') {
			const current =
				pending && now.getTime() < slotOn(reportTime, slotDay(pending)) + Time.days.toMilliseconds
					? pending
					: null;
			const slot = dueSlot(reportTime, now);
			const reportDue = current
				? !isInRetryDelay(current, retryNow)
				: slot !== null && !(await this.reportRepository.hasSettledToday(slot));
			work = { expiredReport: current ? null : pending, reportDue, slot };
		}

		return work;
	}

	/** Skip the report whose slot passed at `now`, then send the report due at `now`, if any. */
	async sendDueReport(now: Date): Promise<void> {
		const { expiredReport, reportDue, slot } = await this.findDueWork(now);

		if (expiredReport) {
			await this.skip(
				expiredReport.id,
				expiredReport.attempts,
				'slot-passed',
				expiredReport.lastError,
			);
		}
		if (reportDue) {
			await this.sendReport(slot);
		}
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
	 * A new report is created for the UTC day of `slot` and ends on the day before
	 * it, also when it is sent after midnight. Without a pending report and a
	 * `slot`, nothing is sent.
	 *
	 * @throws when delivery fails and a retry may succeed, so the scheduler retries with backoff.
	 */
	async sendReport(slot: Date | null): Promise<void> {
		const licenseCert = this.config.instanceReportingAuthToken
			? undefined
			: await this.license.loadCertStr();
		if (licenseCert === '') {
			this.logger.warn(
				'Skipping the instance report because this instance has no license certificate.',
			);
		} else {
			const report = await this.findOrCreateReport(slot);
			if (report?.status === 'pending' && report.attempts >= MAX_ATTEMPTS) {
				// Recover a stop between recording the last failure and settling the row.
				await this.skip(report.id, report.attempts, 'max-retries', report.lastError);
			} else if (report?.status === 'pending') {
				const claimedAt = await this.reportRepository.claimForSend(report.id);
				if (claimedAt) {
					await this.deliverReport(report, claimedAt, licenseCert);
				}
			}
		}
	}

	private async findOrCreateReport(slot: Date | null): Promise<InstanceMonitoringReport | null> {
		let report = await this.reportRepository.findPending();
		if (!report && slot) {
			const days = await this.missedDays(slot);
			if (days.length > 0) {
				// `null` when a concurrent pass created the row. That pass sends it.
				report = await this.reportRepository.createPending(
					await this.collectDataPoints(days),
					slot,
				);
			}
		}
		return report;
	}

	private async deliverReport(
		report: InstanceMonitoringReport,
		claimedAt: Date,
		licenseCert: string | undefined,
	): Promise<void> {
		const payload = {
			instanceId: this.instanceSettings.instanceId,
			batchId: report.id,
			...(this.config.instanceReportingLabel ? { label: this.config.instanceReportingLabel } : {}),
			n8nVersion: N8N_VERSION,
			dataPoints: report.dataPoints,
			...(licenseCert ? { licenseCert } : {}),
		};

		let accepted = false;
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
			accepted = true;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const recorded = await this.reportRepository.recordFailure(
				report.id,
				claimedAt,
				message,
				await this.reportRepository.readDbNow(),
			);
			if (recorded) {
				this.eventService.emit('instance-report-failed');
				const attempts = report.attempts + 1;
				if (error instanceof InstanceReportRejectedError) {
					await this.skip(report.id, attempts, 'rejected', message);
				} else if (attempts >= MAX_ATTEMPTS) {
					await this.skip(report.id, attempts, 'max-retries', message);
				}
			}

			if (!(error instanceof InstanceReportRejectedError)) {
				throw error;
			}
		}

		if (accepted) {
			const recorded = await this.reportRepository.markDelivered(
				report.id,
				await this.reportRepository.readDbNow(),
			);
			if (recorded) {
				this.eventService.emit('instance-report-delivered');
				this.logger.debug('Sent instance report', { batchId: report.id });
			}
		}
	}

	/** Stop trying to deliver this report; the next one covers its days again. */
	private async skip(
		id: string,
		attempts: number,
		reason: SkipReason,
		lastError: string | null,
	): Promise<void> {
		if (await this.reportRepository.markSkipped(id)) {
			this.logger.error(SKIP_MESSAGES[reason], { batchId: id, attempts, lastError });
		}
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
		// Only hourly rows split exactly into UTC days: Postgres compacts older hours
		// into days of the session's time zone, which need not be UTC. One day of
		// margin, since Postgres also dates this threshold in that time zone.
		const oldestAllowedDay = utcDayBefore(
			now,
			Math.max(1, this.insightsConfig.compactionHourlyToDailyThresholdDays - 1),
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
		const [billableByDay, { productionRootExecutions }] = await Promise.all([
			this.insightsService.getDailyBillableExecutions({
				startDate: new Date(`${days[0]}T00:00:00.000Z`),
				endDate: new Date(`${days.at(-1)}T00:00:00.000Z`),
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
				value: billableByDay.get(date) ?? 0,
				date,
			})),
		];
	}
}

/** Epoch milliseconds of the configured time on this UTC day. */
function slotOn(reportTime: string, day: Date): number {
	const [hour, minute] = reportTime.split(':').map(Number);
	return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute);
}

/** The UTC day of the report's slot. A legacy row without `reportDate` falls back to `createdAt`. */
function slotDay(report: InstanceMonitoringReport): Date {
	return report.reportDate ? new Date(`${report.reportDate}T00:00:00.000Z`) : report.createdAt;
}

/** The latest slot at or before `now`, or `null` once yesterday's slot is past its grace. */
function dueSlot(reportTime: string, now: Date): Date | null {
	const today = slotOn(reportTime, now);
	const yesterday = today - Time.days.toMilliseconds;
	if (now.getTime() >= today) {
		return new Date(today);
	}
	return now.getTime() - yesterday < SLOT_GRACE_MS ? new Date(yesterday) : null;
}

function isInRetryDelay(report: InstanceMonitoringReport, now: Date): boolean {
	return (
		report.lastAttemptAt !== null && now.getTime() - report.lastAttemptAt.getTime() < RETRY_DELAY_MS
	);
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
