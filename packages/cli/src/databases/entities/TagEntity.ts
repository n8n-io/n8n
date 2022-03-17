/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */
import {
	BeforeUpdate,
	Column,
	CreateDateColumn,
	Entity,
	Generated,
	Index,
	ManyToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from 'typeorm';
import { IsDate, IsOptional, IsString, Length } from 'class-validator';

import config = require('../../../config');
import { DatabaseType } from '../../index';
import { ITagDb } from '../../Interfaces';
import { idStringifier } from '../utils/transformers';
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
export class TagEntity implements ITagDb {
	@Generated()
	@PrimaryColumn({
		transformer: idStringifier,
	})
	id: number;

	@Column({ length: 24 })
	@Index({ unique: true })
	@IsString({ message: 'Tag name must be of type string.' })
	@Length(1, 24, { message: 'Tag name must be $constraint1 to $constraint2 characters long.' })
	name: string;

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
