import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './User';
import { WithTimestamps } from './AbstractEntity';
import { Project } from './Project';

export type ProjectRole =
	| 'project:admin'
	| 'project:editor'
	| 'project:workflowEditor'
	| 'project:viewer';

@Entity()
export class ProjectRelation extends WithTimestamps {
	@Column()
	role: ProjectRole;

	@ManyToOne('User', 'projectRelations')
	user: User;

	@PrimaryColumn()
	userId: string;

	@ManyToOne('Project', 'projectRelations')
	project: Project;

	@PrimaryColumn()
	projectId: string;
}
