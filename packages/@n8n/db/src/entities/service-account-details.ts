import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, Relation } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { ServiceAccount } from './service-account';

/** Data of a service account that does not belong on the `user` table. */
@Entity({ name: 'service_account_details' })
export class ServiceAccountDetails extends WithTimestamps {
	@PrimaryColumn('uuid')
	userId: string;

	@OneToOne('ServiceAccount', 'details', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	serviceAccount: Relation<ServiceAccount>;

	/** The name that the UI shows for the service account. */
	@Column({ type: 'varchar', length: 128 })
	name: string;
}
