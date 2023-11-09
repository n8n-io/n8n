import { Column, Entity, Index, ManyToMany, OneToMany } from 'typeorm';
import { IsString, Length } from 'class-validator';
import type { WorkflowEntity } from './WorkflowEntity';
import type { WorkflowTagMapping } from './WorkflowTagMapping';
import { WithTimestampsAndStringId } from './AbstractEntity';

@Entity()
export class TagEntity extends WithTimestampsAndStringId {
	@Column({ length: 24 })
	@Index({ unique: true })
	@IsString({ message: 'Tag name must be of type string.' })
	@Length(1, 24, { message: 'Tag name must be $constraint1 to $constraint2 characters long.' })
	name: string;

	@ManyToMany('WorkflowEntity', 'tags')
	workflows: WorkflowEntity[];

	@OneToMany('WorkflowTagMapping', 'tags')
	workflowMappings: WorkflowTagMapping[];
}
