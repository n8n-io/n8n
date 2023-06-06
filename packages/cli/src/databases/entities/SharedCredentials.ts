import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { CredentialsEntity } from './CredentialsEntity';
import { User } from './User';
import { AbstractEntity } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

@Entity()
export class SharedCredentials extends AbstractEntity {
	@Column()
	role: string;

	@ManyToOne('User', 'sharedCredentials')
	user: User;

	@PrimaryColumn()
	userId: string;

	@ManyToOne('CredentialsEntity', 'shared')
	credentials: CredentialsEntity;

	@PrimaryColumn({ transformer: idStringifier })
	credentialsId: string;
}
