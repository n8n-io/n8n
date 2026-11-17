import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithCreatedAt } from './abstract-entity';

/** One process's registration for one lease kind. Its leases are valid until `expiresAt`. */
@Entity({ name: 'lease_session' })
@Index(['leaseKind', 'expiresAt'])
export class LeaseSession extends WithCreatedAt {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 24 })
	leaseKind: string;

	@Column({ type: 'varchar', length: 255 })
	hostId: string;

	@Column({ type: 'uuid' })
	bootId: string;

	@Column({ type: 'int' })
	leaseDurationSeconds: number;

	@DateTimeColumn()
	expiresAt: Date;
}
