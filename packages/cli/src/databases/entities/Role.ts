import {
	BeforeUpdate,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	ManyToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { IsDate, IsOptional, IsString, Length } from 'class-validator';

import config = require('../../../config');
import { DatabaseType } from '../../index';
import { WorkflowEntity } from './WorkflowEntity';

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
export class Role {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ length: 32 })
	@Index({ unique: true })
	@IsString({ message: 'Role name must be of type string.' })
	@Length(1, 32, { message: 'Role name must be 1 to 32 characters long.' })
	name: string;

	@Column()
	scope: string;

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

	@ManyToMany(() => WorkflowEntity, (workflow) => workflow.tags)
	workflows: WorkflowEntity[];

	@BeforeUpdate()
	setUpdateDate() {
		this.updatedAt = new Date();
	}
}
