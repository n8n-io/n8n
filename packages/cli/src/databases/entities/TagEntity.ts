import { Column, Entity, Generated, Index, ManyToMany, PrimaryColumn } from 'typeorm';
import { IsString, Length } from 'class-validator';

import { idStringifier } from '../utils/transformers';
import type { WorkflowEntity } from './WorkflowEntity';
import { AbstractEntity } from './AbstractEntity';

@Entity()
export class TagEntity extends AbstractEntity {
	@Generated()
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Column({ length: 24 })
	@Index({ unique: true })
	@IsString({ message: 'Tag name must be of type string.' })
	@Length(1, 24, { message: 'Tag name must be $constraint1 to $constraint2 characters long.' })
	name: string;

	@ManyToMany('WorkflowEntity', 'tags')
	workflows: WorkflowEntity[];
}
