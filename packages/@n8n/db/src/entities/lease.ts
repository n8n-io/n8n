import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';
import { bigintStringToNumber } from '../utils/transformers';

@Entity({ name: 'lease' })
@Index(['leaseKind', 'leaseSessionId'])
export class Lease extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 24 })
	leaseKind: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	key: string;

	@Column({ type: 'text' })
	data: string;

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

	@Column({ type: 'boolean', default: false })
	revoked: boolean;

	@DateTimeColumn({ nullable: true })
	revokedAt: Date | null;
}
