import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomInt } from 'node:crypto';
import { jsonParse } from 'n8n-workflow';

import { InsightsConfig } from '@/modules/insights/insights.config';
import { CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY } from './instance-reporting.constants';

/** `HH:mm`, 24-hour. ISO 8601's local-time form; this instance reads it as UTC. */
const REPORT_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const MINUTES_PER_DAY = 24 * 60;

/**
 * No instance reports before 03:00 UTC, whatever the compaction interval.
 *
 * A report reads the summary from `insights_by_period`, which only holds what
 * compaction has already rolled up, so reporting too soon after midnight omits
 * the tail of the day being reported. Three hours clears twice the default
 * compaction interval with room to spare; a longer configured interval raises
 * the floor further (see {@link InstanceReportingSettingsService.compactionFloorMinutes}).
 */
const EARLIEST_REPORT_MINUTES = 3 * 60;

interface CentralInstanceMonitoringSettings {
	reportTime: string;
}

/**
 * Owns this instance's reporting time: the minute of the UTC day its daily
 * report fires at.
 *
 * The time is random per instance and persisted on first boot, so a fleet
 * spreads its requests across the day instead of every instance calling the
 * receiver in the same minute. It is otherwise left alone, so an instance keeps
 * reporting at the same time for its whole life — the one exception being a
 * compaction interval long enough to make the stored time unsafe, which shifts
 * it later (see {@link clearCompactionWindow}).
 */
@Service()
export class InstanceReportingSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly insightsConfig: InsightsConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-reporting');
	}

	/**
	 * This instance's report time as `HH:mm` UTC, generating and persisting it on
	 * first call and healing a time the current compaction interval has made
	 * unsafe.
	 *
	 * Called by `InstanceReportingScheduler` on every tick, not just once — cheap
	 * (one settings read, most calls no-op) and it means the healing check runs
	 * against the compaction interval's current value on every pass rather than
	 * only at startup. The interval is an env var, so in practice it only ever
	 * changes across a restart, but nothing here assumes that.
	 */
	async getReportTime(): Promise<string> {
		const stored = await this.readReportTime();
		if (stored) return await this.clearCompactionWindow(stored);

		const candidate: CentralInstanceMonitoringSettings = { reportTime: this.randomReportTime() };
		// A conditional one-time claim, so concurrent mains booting together settle
		// on one time rather than each writing its own.
		await this.settingsRepository.claimKey(
			CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY,
			JSON.stringify(candidate),
		);

		// Re-read rather than trusting `candidate`: losing the claim means adopting
		// the winner's time.
		const claimed = await this.readReportTime();
		if (claimed) {
			this.logger.debug('Resolved the instance reporting time', { reportTime: claimed });
			return await this.clearCompactionWindow(claimed);
		}

		// The row exists but holds nothing usable, which only a hand-edit or a
		// half-finished claim produces. Overwrite it so reporting still has a time.
		this.logger.warn(
			'Instance reporting time setting is missing or malformed; writing a fresh one',
			{ key: CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY },
		);
		await this.persistReportTime(candidate.reportTime);
		return candidate.reportTime;
	}

	/**
	 * The stored time, moved later if it no longer clears the compaction window,
	 * and persisted so the instance keeps the corrected one from here on.
	 *
	 * Raising the compaction interval is what puts a previously fine time inside
	 * the window; the report generated before this heals under-counts the tail of
	 * its day, which is the accepted cost of not pinning the time to a config value
	 * forever. The shift is derived from the stored time rather than re-rolled, so
	 * every main computes the same corrected value and concurrent writes converge.
	 */
	private async clearCompactionWindow(reportTime: string): Promise<string> {
		const floor = this.compactionFloorMinutes();
		const minutes = toMinutes(reportTime);
		if (minutes >= floor) return reportTime;

		// Keep the instance's offset within the day so a fleet shifting together
		// stays spread out, instead of every instance landing on the new floor.
		const offset = Math.max(0, minutes - EARLIEST_REPORT_MINUTES) % (MINUTES_PER_DAY - floor);
		const shifted = toReportTime(floor + offset);

		await this.persistReportTime(shifted);
		this.logger.warn(
			'Moved the instance reporting time later so it clears the insights compaction window',
			{
				previousReportTime: reportTime,
				reportTime: shifted,
				compactionIntervalMinutes: this.insightsConfig.compactionIntervalMinutes,
			},
		);

		return shifted;
	}

	/**
	 * The earliest minute of the UTC day a report may run: twice the compaction
	 * interval, so a day's last events are rolled up even when the compaction timer
	 * (a plain interval started at boot, with no alignment to the clock) has just
	 * missed them. Never earlier than {@link EARLIEST_REPORT_MINUTES}, and never so
	 * late that no minute of the day qualifies.
	 */
	private compactionFloorMinutes(): number {
		const required = 2 * this.insightsConfig.compactionIntervalMinutes;

		return Math.min(Math.max(EARLIEST_REPORT_MINUTES, required), MINUTES_PER_DAY - 1);
	}

	/** A random minute of the day at or after the compaction floor. */
	private randomReportTime(): string {
		return toReportTime(randomInt(this.compactionFloorMinutes(), MINUTES_PER_DAY));
	}

	private async persistReportTime(reportTime: string): Promise<void> {
		await this.settingsRepository.upsertByKey(
			CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY,
			JSON.stringify({ reportTime } satisfies CentralInstanceMonitoringSettings),
			/* loadOnStartup= */ false,
			{},
		);
	}

	/** The persisted time, or `undefined` when the key is absent, empty or malformed. */
	private async readReportTime(): Promise<string | undefined> {
		const setting = await this.settingsRepository.findByKey(
			CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY,
		);
		if (!setting?.value) return undefined;

		const parsed = jsonParse<Partial<CentralInstanceMonitoringSettings>>(setting.value, {
			fallbackValue: {},
		});
		const { reportTime } = parsed;

		return typeof reportTime === 'string' && REPORT_TIME_PATTERN.test(reportTime)
			? reportTime
			: undefined;
	}
}

/** Minutes since UTC midnight for an `HH:mm` time. */
function toMinutes(reportTime: string): number {
	const [hour, minute] = reportTime.split(':');

	return Number(hour) * 60 + Number(minute);
}

/** `HH:mm` for a count of minutes since UTC midnight. */
function toReportTime(minutes: number): string {
	return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}
