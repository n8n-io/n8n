import {
	Column,
	Entity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	OneToMany,
	Index,
} from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Project } from './project';
import { TagEntity } from './tag-entity';
import { User } from './user';
import type { WorkflowEntity } from './workflow-entity';

@Entity('workflow_folders')
export class Folder extends WithTimestampsAndStringId {
	@Column()
	name: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ nullable: true })
	parentFolderId: string | null;

	@ManyToOne(() => Folder, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'parentFolderId' })
	parentFolder: Folder | null;

	@OneToMany(
		() => Folder,
		(folder) => folder.parentFolder,
	)
	subFolders: Folder[];

	@Column({ default: '' })
	@Index()
	path: string;

	@Column({ type: 'int', default: 0 })
	@Index()
	level: number;

	@Column({ type: 'int', default: 0 })
	position: number;

	@Column({ length: 7, default: '#6366f1' })
	color: string;

	@Column({ default: 'folder' })
	icon: string;

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	homeProject: Project;

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({ name: 'createdBy' })
	createdByUser: User | null;

	@OneToMany('WorkflowEntity', 'parentFolder')
	workflows: WorkflowEntity[];

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
