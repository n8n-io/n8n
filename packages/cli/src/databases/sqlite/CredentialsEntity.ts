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

	@Column('simple-json')
	nodesAccess: ICredentialNodeAccess[];

	@Column()
	createdAt: Date;

	@Column()
	updatedAt: Date;
}
