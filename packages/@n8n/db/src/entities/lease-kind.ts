import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';
import { bigintStringToNumber } from '../utils/transformers';

@Entity({ name: 'lease_kind' })
export class LeaseKind extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 24 })
	kind: string;

	/** Source of fencing tokens. It never resets, so a recreated key gets a higher token. */
	@Column({ type: 'bigint', default: 0, transformer: bigintStringToNumber })
	fencingTokenCounter: number;

	@Column({ type: 'varchar', length: 36, nullable: true })
	syncLockRoundId: string | null;

	@DateTimeColumn({ nullable: true })
	syncLockExpiresAt: Date | null;

	@DateTimeColumn({ nullable: true })
	lastFullSyncAt: Date | null;
}
