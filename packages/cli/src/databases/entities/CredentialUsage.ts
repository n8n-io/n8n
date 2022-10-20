/* eslint-disable import/no-cycle */
import {
	BeforeUpdate,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryColumn,
	RelationId,
	UpdateDateColumn,
} from 'typeorm';
import { IsDate, IsOptional } from 'class-validator';

import config = require('../../../config');
import { DatabaseType } from '../../index';
import { WorkflowEntity } from './WorkflowEntity';
import { CredentialsEntity } from './CredentialsEntity';

function getTimestampSyntax() {
	const dbType = config.get('database.type') as DatabaseType;

	const map: { [key in DatabaseType]: string } = {
		sqlite: "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')",
		postgresdb: 'CURRENT_TIMESTAMP(3)',
		mysqldb: 'CURRENT_TIMESTAMP(3)',
		mariadb: 'CURRENT_TIMESTAMP(3)',
	};

	return map[dbType];
}

@Entity()
export class CredentialUsage {
	@ManyToOne(() => WorkflowEntity, {
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@ManyToOne(() => CredentialsEntity, {
		onDelete: 'CASCADE',
	})
	credential: CredentialsEntity;

	@RelationId((credentialUsage: CredentialUsage) => credentialUsage.workflow)
	@PrimaryColumn()
	workflowId: number;

	@PrimaryColumn()
	nodeId: string;

	@RelationId((credentialUsage: CredentialUsage) => credentialUsage.credential)
	@PrimaryColumn()
	credentialId: string;

	@CreateDateColumn({ precision: 3, default: () => getTimestampSyntax() })
	@IsOptional() // ignored by validation because set at DB level
	@IsDate()
	createdAt: Date;

	@UpdateDateColumn({
		precision: 3,
		default: () => getTimestampSyntax(),
		onUpdate: getTimestampSyntax(),
	})
	@IsOptional() // ignored by validation because set at DB level
	@IsDate()
	updatedAt: Date;

	@BeforeUpdate()
	setUpdateDate(): void {
		this.updatedAt = new Date();
	}
}
