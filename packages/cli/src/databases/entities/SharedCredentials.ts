import { Entity, ManyToOne, PrimaryColumn, RelationId } from 'typeorm';
import type { CredentialsEntity } from './CredentialsEntity';
import type { User } from './User';
import type { Role } from './Role';
import { AbstractEntity } from './AbstractEntity';

@Entity()
export class SharedCredentials extends AbstractEntity {
	@ManyToOne('Role', 'sharedCredentials', { nullable: false })
	role: Role;

	@ManyToOne('User', 'sharedCredentials', { primary: true })
	user: User;

	@PrimaryColumn()
	@RelationId((sharedCredential: SharedCredentials) => sharedCredential.user)
	userId: string;

	@ManyToOne('CredentialsEntity', 'shared', {
		primary: true,
		onDelete: 'CASCADE',
	})
	credentials: CredentialsEntity;

	@PrimaryColumn()
	@RelationId((sharedCredential: SharedCredentials) => sharedCredential.credentials)
	credentialsId: number;
}
