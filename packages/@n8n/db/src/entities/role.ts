import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { ProjectRelation } from './project-relation';
import { Scope } from './scope';

@Entity({
	name: 'role',
})
export class Role extends WithTimestamps {
	@PrimaryColumn({
		type: String,
		name: 'slug',
	})
	slug: string;

	@Column({
		type: String,
		nullable: false,
		name: 'displayName',
	})
	displayName: string;

	@Column({
		type: String,
		nullable: true,
		name: 'description',
	})
	description: string | null;

	@Column({
		type: Boolean,
		default: false,
		name: 'systemRole',
	})
	/**
	 * Indicates if the role is managed by the system and cannot be edited.
	 */
	systemRole: boolean;

	@Column({
		type: String,
		name: 'roleType',
	})
	/**
	 * Type of the role, e.g., global, project, or workflow.
	 */
	roleType: 'global' | 'project' | 'workflow' | 'credential';

	@OneToMany('ProjectRelation', 'role')
	projectRelations: ProjectRelation[];

	@ManyToMany(() => Scope, {
		eager: true,
	})
	@JoinTable({
		name: 'role_scope',
		joinColumn: { name: 'roleSlug', referencedColumnName: 'slug' },
		inverseJoinColumn: { name: 'scopeSlug', referencedColumnName: 'slug' },
	})
	scopes: Scope[];
}
