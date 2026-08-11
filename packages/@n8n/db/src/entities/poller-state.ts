import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, JsonColumn, WithTimestamps } from './abstract-entity';

export type PollerCursor = Record<string, unknown>;

/**
 * Durable state for one poll trigger node.
 *
 * State is kept per node rather than per workflow so that two poll nodes in one
 * workflow don't contend on every write.
 */
@Entity({ name: 'poller_state' })
export class PollerState extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	nodeId: string;

	/**
	 * How far the node has consumed its source. The shape is the node's own,
	 * e.g. a timestamp, a page token, or a list of already-emitted ids.
	 */
	@JsonColumn({ default: '{}' })
	cursor: PollerCursor;

	@Column({ type: 'int', default: 0 })
	consecutiveErrors: number;

	/** Time before which no poll is attempted. */
	@DateTimeColumn({ nullable: true })
	backoffUntil: Date | null;
}
