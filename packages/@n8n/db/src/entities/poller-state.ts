import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, JsonColumn, WithTimestamps } from './abstract-entity';

export type PollerCursor = Record<string, unknown>;

// Kept per node, not per workflow, so two poll nodes in one workflow don't contend on every write.
@Entity({ name: 'poller_state' })
export class PollerState extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	nodeId: string;

	/** The node's own cursor shape, e.g. a timestamp, a page token, or a list of consumed ids. */
	@JsonColumn({ default: '{}' })
	cursor: PollerCursor;

	@Column({ type: 'int', default: 0 })
	consecutiveErrors: number;

	@DateTimeColumn({ nullable: true })
	backoffUntil: Date | null;
}
