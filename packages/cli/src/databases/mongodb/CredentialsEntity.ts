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
	ObjectID,
	ObjectIdColumn,
} from 'typeorm';

@Entity()
export class CredentialsEntity implements ICredentialsDb {

	@ObjectIdColumn()
	id: ObjectID;

	@Column()
	name: string;

	@Column()
	data: string;

	@Index()
	@Column()
	type: string;

	@Column('json')
	nodesAccess: ICredentialNodeAccess[];

	@Column('Date')
	createdAt: Date;

	@Column('Date')
	updatedAt: Date;
}
