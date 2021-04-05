import { Column, Entity, Index, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ITagDb } from '../../Interfaces';
import { WorkflowEntity } from './WorkflowEntity';

@Entity()
export class TagEntity implements ITagDb {

	@PrimaryGeneratedColumn()
	id: number;

	@Index({ unique: true })
	@Column({ length: 24 })
	name: string;

	@Column()
	createdAt: Date;

	@Column()
	updatedAt: Date;

	@ManyToMany(() => WorkflowEntity, workflow => workflow.tags)
	workflows: WorkflowEntity[];
}
