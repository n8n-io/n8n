/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */
import { ICredentialNodeAccess } from 'n8n-workflow';

import {
	BeforeUpdate,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { getTimestampSyntax, resolveDataType } from '../utils';

import { ICredentialsDb } from '../..';

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

	@Column(resolveDataType('json'))
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
