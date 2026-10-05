import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

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

	/** PROTOTYPE (workspaces): the workspace that granted this relation through its member cascade. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	inheritedFromId: string | null;
}
