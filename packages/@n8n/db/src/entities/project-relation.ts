import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { Project } from './project';
import { Role } from './role';
import { User } from './user';

@Entity()
export class ProjectRelation extends WithTimestamps {
	@ManyToOne('Role', 'projectRelations')
	@JoinColumn({ name: 'role', referencedColumnName: 'slug' })
	role: Role;

	@ManyToOne('User', 'projectRelations')
	user: User;

	@PrimaryColumn('uuid')
	userId: string;

	@ManyToOne('Project', 'projectRelations')
	project: Project;

	@PrimaryColumn()
	projectId: string;
}
