import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ITagDb } from '../../Interfaces';
import { WorkflowEntity } from './WorkflowEntity';

@Entity()
export class TagEntity implements ITagDb {

	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true, length: 24 })
	name: string;

	@Column()
	createdAt: Date;

	@Column()
	updatedAt: Date;

	@ManyToMany(() => WorkflowEntity, workflowEntity => workflowEntity.tags)
	workflows: WorkflowEntity[];
}
