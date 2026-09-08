import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Relation,
	Unique,
} from '@n8n/typeorm';

import { WithCreatedAt } from './abstract-entity';
import type { CredentialsEntity } from './credentials-entity';

export type CredentialDependencyType = 'externalSecretProvider';

@Entity({ name: 'credential_dependency' })
@Index(['dependencyType', 'dependencyId'])
@Unique(['credentialId', 'dependencyType', 'dependencyId'])
export class CredentialDependency extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ length: 36 })
	@Index()
	credentialId: string;

	@Column({ length: 64 })
	dependencyType: CredentialDependencyType;

	@Column({ length: 255 })
	dependencyId: string;

	@ManyToOne('CredentialsEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'credentialId' })
	credential: Relation<CredentialsEntity>;
}
