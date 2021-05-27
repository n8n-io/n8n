import {
	ICredentialNodeAccess,
} from 'n8n-workflow';

import {
	ICredentialsDb,
} from '../../';

import {
	Column,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class CredentialsEntity implements ICredentialsDb {

	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 128,
	})
	name: string;

	@Column('text')
	data: string;

	@Index()
	@Column({
		length: 32,
	})
	type: string;

	@Column('json')
	nodesAccess: ICredentialNodeAccess[];

	@Column('datetime')
	createdAt: Date;

	@Column('datetime')
	updatedAt: Date;
}
