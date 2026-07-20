import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	Relation,
} from '@n8n/typeorm';

import type { CredentialsEntity } from './credentials-entity';

@Entity({ name: 'instance_credential_assignment' })
export class InstanceCredentialAssignment {
	@PrimaryColumn({ type: 'varchar', length: 128 })
	consumerId: string;

	@Column({ type: 'varchar', length: 36 })
	@Index()
	credentialId: string;

	@ManyToOne('CredentialsEntity', { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'credentialId' })
	credential: Relation<CredentialsEntity>;
}
