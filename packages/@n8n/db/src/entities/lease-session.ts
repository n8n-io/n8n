import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithCreatedAt } from './abstract-entity';

@Entity({ name: 'lease_session' })
@Index(['kind', 'expiresAt'])
export class LeaseSession extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	id: string;

	@Column({ type: 'varchar', length: 24 })
	kind: string;

	@Column({ type: 'varchar', length: 255 })
	hostId: string;

	@Column({ type: 'varchar', length: 36 })
	bootId: string;

	@Column({ type: 'int' })
	leaseSeconds: number;

	@DateTimeColumn()
	expiresAt: Date;
}
