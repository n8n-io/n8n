import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

/** One measurement in a report; the shape the receiver accepts. */
export type InstanceReportDataPoint =
	| { kind: 'cumulative'; name: string; value: number }
	| { kind: 'daily'; name: string; value: number; date: string };

/**
 * One instance report: what was sent to the central monitoring receiver, and
 * whether it arrived.
 *
 * The row is written before the request goes out, so a report always leaves a
 * trace even when delivery fails, and its {@link id} travels with the payload as
 * `batchId`. `createdAt` is when the report was generated and
 * {@link deliveredAt} when the receiver accepted it; the day a measurement
 * covers is not a property of the report, it lives on the daily data point
 * itself. A future backfill reads the gap since the last delivered row.
 */
@Entity()
export class CentralInstanceMonitoringReport extends WithTimestampsAndStringId {
	/** The data point array exactly as sent. */
	@JsonColumn()
	dataPoints: InstanceReportDataPoint[];

	/** When the receiver accepted the report; `null` while undelivered. */
	@DateTimeColumn({ nullable: true })
	deliveredAt: Date | null;

	/** Delivery attempts made so far, successful or not. */
	@Column({ type: 'int', default: 0 })
	attempts: number;

	/** Message of the most recent delivery failure. */
	@Column({ type: 'text', nullable: true })
	lastError: string | null;
}
