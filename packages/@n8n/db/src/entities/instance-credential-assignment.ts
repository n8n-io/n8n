import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	Relation,
} from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { CredentialsEntity } from './credentials-entity';

@Entity({ name: 'instance_credential_assignment' })
export class InstanceCredentialAssignment extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 128 })
	credentialUseId: string;

	@Column({ type: 'varchar', length: 36 })
	@Index()
	credentialId: string;

	@ManyToOne('CredentialsEntity', { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'credentialId' })
	credential: Relation<CredentialsEntity>;
}
