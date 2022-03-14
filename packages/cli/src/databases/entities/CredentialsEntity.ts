/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */
import { ICredentialNodeAccess } from 'n8n-workflow';

import {
	BeforeUpdate,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

import { IsArray, IsObject, IsString, Length } from 'class-validator';
import config = require('../../../config');
import { DatabaseType, ICredentialsDb } from '../..';
import { SharedCredentials } from './SharedCredentials';

function resolveDataType(dataType: string) {
	const dbType = config.get('database.type') as DatabaseType;

	const typeMap: { [key in DatabaseType]: { [key: string]: string } } = {
		sqlite: {
			json: 'simple-json',
		},
		postgresdb: {
			datetime: 'timestamptz',
		},
		mysqldb: {},
		mariadb: {},
	};

	return typeMap[dbType][dataType] ?? dataType;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function getTimestampSyntax() {
	const dbType = config.get('database.type') as DatabaseType;

	const map: { [key in DatabaseType]: string } = {
		sqlite: `STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')`,
		postgresdb: 'CURRENT_TIMESTAMP(3)',
		mysqldb: 'CURRENT_TIMESTAMP(3)',
		mariadb: 'CURRENT_TIMESTAMP(3)',
	};

	return map[dbType];
}

@Entity()
export class CredentialsEntity implements ICredentialsDb {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ length: 128 })
	@IsString({ message: 'Credential `name` must be of type string.' })
	@Length(3, 128, {
		message: 'Credential name must be $constraint1 to $constraint2 characters long.',
	})
	name: string;

	@Column('text')
	@IsObject()
	data: string;

	@Index()
	@IsString({ message: 'Credential `type` must be of type string.' })
	@Column({
		length: 128,
	})
	type: string;

	@OneToMany(() => SharedCredentials, (sharedCredentials) => sharedCredentials.credentials)
	shared: SharedCredentials[];

	@Column(resolveDataType('json'))
	@IsArray()
	nodesAccess: ICredentialNodeAccess[];

	@CreateDateColumn({ precision: 3, default: () => getTimestampSyntax() })
	createdAt: Date;

	@UpdateDateColumn({
		precision: 3,
		default: () => getTimestampSyntax(),
		onUpdate: getTimestampSyntax(),
	})
	updatedAt: Date;

	@BeforeUpdate()
	setUpdateDate() {
		this.updatedAt = new Date();
	}
}
