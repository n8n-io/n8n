import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import type { CredentialsEntity } from './CredentialsEntity';
import type { User } from './User';
import type { Role } from './Role';
import { AbstractEntity } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

@Entity()
export class SharedCredentials extends AbstractEntity {
	@ManyToOne('Role', 'sharedCredentials', { nullable: false })
	role: Role;

	@Column()
	roleId: string;

	@ManyToOne('User', 'sharedCredentials')
	user: User;

	@PrimaryColumn()
	userId: string;

	@ManyToOne('CredentialsEntity', 'shared')
	credentials: CredentialsEntity;

	@PrimaryColumn({ transformer: idStringifier })
	credentialsId: string;
}
