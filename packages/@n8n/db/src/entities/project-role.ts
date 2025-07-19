import { Entity, JoinTable, ManyToMany } from '@n8n/typeorm';

import { BaseRole } from './base-role';
import { Scope } from './scope';

@Entity({
	name: 'project_role',
})
export class ProjectRole extends BaseRole {
	@ManyToMany(() => Scope, {
		eager: true,
	})
	@JoinTable({
		name: 'project_role_scope',
		joinColumn: { name: 'role_slug', referencedColumnName: 'slug' },
		inverseJoinColumn: { name: 'scope_slug', referencedColumnName: 'slug' },
	})
	scopes: Scope[];
}
