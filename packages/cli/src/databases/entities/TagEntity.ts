/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */
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

import { ITagDb } from '../../Interfaces';
import { WorkflowEntity } from './WorkflowEntity';
import { getTimestampSyntax } from '../utils';

@Entity()
export class TagEntity implements ITagDb {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ length: 24 })
	@Index({ unique: true })
	@IsString({ message: 'Tag name must be of type string.' })
	@Length(1, 24, { message: 'Tag name must be 1 to 24 characters long.' })
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
