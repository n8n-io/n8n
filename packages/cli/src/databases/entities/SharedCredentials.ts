import { Entity, ManyToOne, PrimaryColumn, RelationId } from 'typeorm';
import type { CredentialsEntity } from './CredentialsEntity';
import type { User } from './User';
import type { Role } from './Role';
import { AbstractEntity } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

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

	@PrimaryColumn({ transformer: idStringifier })
	@RelationId((sharedCredential: SharedCredentials) => sharedCredential.credentials)
	credentialsId: string;
}
