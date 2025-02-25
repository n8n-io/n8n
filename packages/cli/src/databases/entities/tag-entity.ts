import { Column, Entity, Index, ManyToMany, OneToMany } from '@n8n/typeorm';
import { IsString, Length } from 'class-validator';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { FolderTagMapping } from './folder-tag-mapping';
import type { WorkflowEntity } from './workflow-entity';
import type { WorkflowTagMapping } from './workflow-tag-mapping';

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

	@OneToMany('FolderTagMapping', 'tags')
	folderMappings: FolderTagMapping[];
}
