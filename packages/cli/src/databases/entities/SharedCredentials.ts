import { Entity, ManyToOne, RelationId } from 'typeorm';
import { CredentialsEntity } from './CredentialsEntity';
import { User } from './User';
import { Role } from './Role';
import { AbstractEntity } from './AbstractEntity';

@Entity()
export class SharedCredentials extends AbstractEntity {
	@ManyToOne(() => Role, (role) => role.sharedCredentials, { nullable: false })
	role: Role;

	@ManyToOne(() => User, (user) => user.sharedCredentials, { primary: true })
	user: User;

	@RelationId((sharedCredential: SharedCredentials) => sharedCredential.user)
	userId: string;

	@ManyToOne(() => CredentialsEntity, (credentials) => credentials.shared, {
		primary: true,
		onDelete: 'CASCADE',
	})
	credentials: CredentialsEntity;

	@RelationId((sharedCredential: SharedCredentials) => sharedCredential.credentials)
	credentialId: number;
}
