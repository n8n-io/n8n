import { Column, Entity, Index, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IsDate, IsString, Length } from 'class-validator';

import { ITagDb } from '../../Interfaces';
import { WorkflowEntity } from './WorkflowEntity';

@Entity()
export class TagEntity implements ITagDb {

	@PrimaryGeneratedColumn()
	id: number;

	@Column({ length: 24 })
	@Index({ unique: true })
	@IsString()
	@Length(1, 24, { message: 'Tag name must be 1 to 24 characters long.' })
	name: string;

	@Column()
	@IsDate()
	createdAt: Date;

	@Column()
	@IsDate()
	updatedAt: Date;

	@ManyToMany(() => WorkflowEntity, workflow => workflow.tags)
	workflows: WorkflowEntity[];
}
