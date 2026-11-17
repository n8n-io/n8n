import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';
import { bigintStringToNumber } from '../utils/transformers';

/** One row for each kind of lease. It holds the fencing-token counter and the sync lock of the kind. */
@Entity({ name: 'lease_kind' })
export class LeaseKind extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 24 })
	kind: string;

	@Column({ type: 'bigint', default: 0, transformer: bigintStringToNumber })
	fencingTokenCounter: number;

	@Column({ type: 'uuid', nullable: true })
	syncLockRoundId: string | null;

	@DateTimeColumn({ nullable: true })
	syncLockExpiresAt: Date | null;

	@DateTimeColumn({ nullable: true })
	lastFullSyncAt: Date | null;
}
