import { WithTimestamps } from '@n8n/db';
import { ProjectRole } from '@n8n/permissions';
import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { Project } from './project';
import { User } from './user';

@Entity()
export class ProjectRelation extends WithTimestamps {
	@Column({ type: String })
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
