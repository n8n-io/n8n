import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, JsonColumn, WithTimestamps } from './abstract-entity';
import { bigintStringToNumber } from '../utils/transformers';

/** One lease that should exist in a kind, and its current holder, if any. */
@Entity({ name: 'lease' })
@Index(['leaseKind', 'leaseSessionId'])
export class Lease extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 24 })
	leaseKind: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	key: string;

	@JsonColumn()
	data: Record<string, unknown>;

	@Column({ type: 'varchar', length: 64 })
	dataHash: string;

	@Column({ type: 'uuid', nullable: true })
	leaseSessionId: string | null;

	@Column({ type: 'bigint', default: 0, transformer: bigintStringToNumber })
	fencingToken: number;

	@DateTimeColumn({ nullable: true })
	claimedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	readyAt: Date | null;

	@DateTimeColumn({ nullable: true })
	revokedAt: Date | null;
}
