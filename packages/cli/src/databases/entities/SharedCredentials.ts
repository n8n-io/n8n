import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { CredentialsEntity } from './CredentialsEntity';
import { User } from './User';
import { WithTimestamps } from './AbstractEntity';

export type CredentialSharingRole = 'credential:owner' | 'credential:user';

@Entity()
export class SharedCredentials extends WithTimestamps {
	@Column()
	role: CredentialSharingRole;

	@ManyToOne('User', 'sharedCredentials')
	user: User;

	@PrimaryColumn()
	userId: string;

	@ManyToOne('CredentialsEntity', 'shared')
	credentials: CredentialsEntity;

	@PrimaryColumn()
	credentialsId: string;
}
