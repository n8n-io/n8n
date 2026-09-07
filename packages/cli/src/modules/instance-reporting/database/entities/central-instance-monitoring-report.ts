import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

/** One measurement in a report; the shape the receiver accepts. */
export type InstanceReportDataPoint =
	| { kind: 'cumulative'; name: string; value: number }
	| { kind: 'daily'; name: string; value: number; date: string };

/**
 * Where a report stands.
 *
 * `SKIPPED_AFTER_MAX_RETRIES` means the instance stopped trying that day, not
 * that the numbers were lost: only a delivered report crosses a day off, so a
 * skipped day is measured again and covered by the next report.
 */
export type InstanceReportStatus = 'PENDING' | 'DELIVERED' | 'SKIPPED_AFTER_MAX_RETRIES';

/**
 * One instance report: what was sent to the central monitoring receiver, and
 * whether it arrived.
 *
 * The row is written before the request goes out, so a report always leaves a
 * trace even when delivery fails, and its {@link id} travels with the payload as
 * `batchId`. `createdAt` is when the report was generated and
 * {@link deliveredAt} when the receiver accepted it; the day a measurement
 * covers is not a property of the report, it lives on the daily data point
 * itself. The next report reads the gap since the last delivered row.
 *
 * The row also holds the retry state — {@link status}, {@link attempts} and
 * {@link lastAttemptAt} — rather than the scheduler holding it in memory, so a
 * restart resumes where the last process left off instead of starting the
 * report's budget again.
 */
@Entity()
export class CentralInstanceMonitoringReport extends WithTimestampsAndStringId {
	/** The data point array exactly as sent. */
	@JsonColumn()
	dataPoints: InstanceReportDataPoint[];

	/** Where the report stands. See {@link InstanceReportStatus}. */
	@Column({ type: 'varchar', length: 255, default: 'PENDING' })
	status: InstanceReportStatus;

	/** When the receiver accepted the report; `null` while undelivered. */
	@DateTimeColumn({ nullable: true })
	deliveredAt: Date | null;

	/** Delivery attempts made so far, successful or not. */
	@Column({ type: 'int', default: 0 })
	attempts: number;

	/**
	 * When the last attempt finished, successful or not; `null` before the first.
	 *
	 * Persisted so the wait between attempts survives a restart. A crash between
	 * attempts would otherwise let the next process attempt at once, and a crash
	 * loop would spend the whole budget in seconds.
	 */
	@DateTimeColumn({ nullable: true })
	lastAttemptAt: Date | null;

	/** Message of the most recent delivery failure. */
	@Column({ type: 'text', nullable: true })
	lastError: string | null;
}
