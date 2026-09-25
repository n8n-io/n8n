import { DateTimeColumn, JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

/** One measurement in a report; the shape the receiver accepts. */
export type InstanceReportDataPoint =
	| { kind: 'cumulative'; name: string; value: number }
	| { kind: 'daily'; name: string; value: number; date: string };

/**
 * Where a report stands.
 *
 * `skipped_after_max_retries` means the instance stopped trying that day, not
 * that the numbers were lost: only a delivered report crosses a day off, so a
 * skipped day is measured again and covered by the next report.
 */
export type InstanceReportStatus = 'pending' | 'delivered' | 'skipped_after_max_retries';

/**
 * One instance report: what was sent to the central monitoring receiver, and
 * whether it arrived.
 *
 * The row is written before the request goes out, so a report always leaves a
 * trace even when delivery fails, and its {@link id} travels with the payload as
 * `batchId`. `createdAt` is when the report was generated and
 * {@link deliveredAt} when the receiver accepted it. The days a report covers
 * live on its daily data points, and the next report reads the gap since the
 * last delivered row.
 *
 * The retry state — {@link status}, {@link attempts} and {@link lastAttemptAt} —
 * lives here rather than in the scheduler's memory, so a restart resumes the
 * report's budget instead of granting a fresh one.
 */
@Entity()
export class InstanceMonitoringReport extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	/** The data point array exactly as sent. */
	@JsonColumn()
	dataPoints: InstanceReportDataPoint[];

	/** Where the report stands. See {@link InstanceReportStatus}. */
	@Column({ type: 'varchar', length: 64, default: 'pending' })
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
	 * Persisted so the wait between attempts survives a restart.
	 */
	@DateTimeColumn({ nullable: true })
	lastAttemptAt: Date | null;

	/** Message of the most recent delivery failure. */
	@Column({ type: 'text', nullable: true })
	lastError: string | null;
}
