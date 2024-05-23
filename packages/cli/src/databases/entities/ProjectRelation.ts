import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { User } from './User';
import { WithTimestamps } from './AbstractEntity';
import { Project } from './Project';

// personalOwner is only used for personal projects
export type ProjectRole = 'project:personalOwner' | 'project:admin' | 'project:editor';

@Entity()
export class ProjectRelation extends WithTimestamps {
	@Column()
	role: ProjectRole;

	@ManyToOne('User', 'projectRelations')
	user: User;

	@PrimaryColumn('uuid')
	userId: string;

	@ManyToOne('Project', 'projectRelations')
	project: Project;

	@PrimaryColumn()
	projectId: string;
}
