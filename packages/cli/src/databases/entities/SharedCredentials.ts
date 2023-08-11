import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { CredentialsEntity } from './CredentialsEntity';
import { User } from './User';
import { Role } from './Role';
import { WithTimestamps } from './AbstractEntity';

@Entity()
export class SharedCredentials extends WithTimestamps {
	@ManyToOne('Role', 'sharedCredentials', { nullable: false })
	role: Role;

	@Column()
	roleId: string; // @TODO: This should be string but is currently number

	@ManyToOne('User', 'sharedCredentials')
	user: User;

	@PrimaryColumn()
	userId: string;

	@ManyToOne('CredentialsEntity', 'shared')
	credentials: CredentialsEntity;

	@PrimaryColumn()
	credentialsId: string;
}
