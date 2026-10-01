import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { TrustedKeySourceStatus, TrustedKeySourceType } from '../../token-exchange.schemas';

@Entity('trusted_key_source')
export class TrustedKeySourceEntity extends WithTimestamps {
	@PrimaryColumn('varchar', { length: 36 })
	id: string;

	@Column({ type: 'varchar', length: 32 })
	type: TrustedKeySourceType;

	@Column('text')
	config: string;

	@Column({ type: 'varchar', length: 32, default: 'pending' })
	status: TrustedKeySourceStatus;

	@Column({ type: 'text', nullable: true })
	lastError: string | null;

	@DateTimeColumn({ nullable: true })
	lastRefreshedAt: Date | null;
}
