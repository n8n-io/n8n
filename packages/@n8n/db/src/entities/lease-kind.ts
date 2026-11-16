import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';
import { bigintStringToNumber } from '../utils/transformers';

@Entity({ name: 'lease_kind' })
export class LeaseKind extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 24 })
	kind: string;

	@Column({ type: 'bigint', default: 0, transformer: bigintStringToNumber })
	tokenCounter: number;

	@Column({ type: 'varchar', length: 36, nullable: true })
	syncHolder: string | null;

	@DateTimeColumn({ nullable: true })
	syncExpiresAt: Date | null;

	@DateTimeColumn({ nullable: true })
	fullPassAt: Date | null;
}
