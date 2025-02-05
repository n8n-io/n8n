import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne } from '@n8n/typeorm';
import { IsString, Length } from 'class-validator';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Project } from './project';
import { TagEntity } from './tag-entity';

@Entity()
export class Folder extends WithTimestampsAndStringId {
	@Column({ length: 36 })
	@IsString({ message: 'Folder name must be of type string.' })
	@Length(1, 36, { message: 'Folder name must be $constraint1 to $constraint2 characters long.' })
	name: string;

	@ManyToOne(() => Folder, { nullable: true })
	@JoinColumn({ name: 'parentId' })
	parent: Folder;

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@ManyToMany(() => TagEntity)
	@JoinTable({
		name: 'folder_tag',
		joinColumn: {
			name: 'folderId',
			referencedColumnName: 'id',
		},
		inverseJoinColumn: {
			name: 'tagId',
			referencedColumnName: 'id',
		},
	})
	tags: TagEntity[];
}
