import { BeforeInsert, Column, Entity, Index, ManyToMany, OneToMany, PrimaryColumn } from 'typeorm';
import { IsString, Length } from 'class-validator';
import type { WorkflowEntity } from './WorkflowEntity';
import type { WorkflowTagMapping } from './WorkflowTagMapping';
import { AbstractEntity } from './AbstractEntity';
import { generateNanoId } from '../utils/generators';

@Entity()
export class TagEntity extends AbstractEntity {
	constructor(data?: Partial<TagEntity>) {
		super();
		Object.assign(this, data);
	}

	@BeforeInsert()
	nanoId() {
		if (!this.id) {
			this.id = generateNanoId();
		}
	}

	@PrimaryColumn('varchar')
	id: string;

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
