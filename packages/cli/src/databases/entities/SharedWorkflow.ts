/* eslint-disable import/no-cycle */
import {
	BeforeUpdate,
	CreateDateColumn,
	Entity,
	ManyToOne,
	RelationId,
	UpdateDateColumn,
} from 'typeorm';
import { IsDate, IsOptional } from 'class-validator';

import config = require('../../../config');
import { DatabaseType } from '../../index';
import { WorkflowEntity } from './WorkflowEntity';
import { User } from './User';
import { Role } from './Role';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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
export class SharedWorkflow {
	@ManyToOne(() => Role, (role) => role.sharedWorkflows, { nullable: false })
	role: Role;

	@ManyToOne(() => User, (user) => user.sharedWorkflows, { primary: true })
	user: User;

	@RelationId((sharedWorkflow: SharedWorkflow) => sharedWorkflow.user)
	userId: string;

	@ManyToOne(() => WorkflowEntity, (workflow) => workflow.shared, {
		primary: true,
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@RelationId((sharedWorkflow: SharedWorkflow) => sharedWorkflow.workflow)
	workflowId: number;

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
