import type { FindOperator, ValueTransformer } from '@n8n/typeorm';
import { Column, Entity, Index, PrimaryColumn, Unique } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';

const nullableIdStringifier = {
	from: (value: number | null): string | null => (value === null ? null : value.toString()),
	to: (value: string | FindOperator<unknown> | null): number | FindOperator<unknown> | null =>
		typeof value === 'string' ? Number(value) : value,
} satisfies ValueTransformer;

export const DataTableTriggerDeliveryStatus = {
	Pending: 'pending',
	InProgress: 'in_progress',
	Completed: 'completed',
	Failed: 'failed',
	Cancelled: 'cancelled',
} as const;

export type DataTableTriggerDeliveryStatus =
	(typeof DataTableTriggerDeliveryStatus)[keyof typeof DataTableTriggerDeliveryStatus];

@Entity({ name: 'data_table_trigger_delivery' })
@Unique(['eventId', 'workflowId', 'nodeId'])
@Index(['status', 'nextAttemptAt', 'id'])
@Index(['status', 'leaseExpiresAt', 'id'])
@Index(['executionId'])
@Index(['workflowId'])
export class DataTableTriggerDelivery extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	eventId: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	nodeId: string;

	@Column({ type: 'bigint', nullable: true, transformer: nullableIdStringifier })
	executionId: string | null;

	@Column({ type: 'varchar', length: 20, default: DataTableTriggerDeliveryStatus.Pending })
	status: DataTableTriggerDeliveryStatus;

	@Column({ type: 'smallint', default: 0 })
	attempts: number;

	@Column({ type: 'varchar', length: 36, nullable: true })
	claimedBy: string | null;

	@Column({ type: 'int', default: 0 })
	leaseEpoch: number;

	@DateTimeColumn({ nullable: true })
	leaseExpiresAt: Date | null;

	@DateTimeColumn({ nullable: true })
	nextAttemptAt: Date | null;

	@DateTimeColumn({ nullable: true })
	dispatchedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	finishedAt: Date | null;

	@Column({ type: 'text', nullable: true })
	error: string | null;
}
