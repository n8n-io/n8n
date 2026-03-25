import {
	BeforeInsert,
	Column,
	Entity,
	Index,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { WithTimestamps } from './abstract-entity';
import { Project } from './project';
import { Role } from './role';

@Entity()
@Index(['role'])
@Index(['type', 'order'])
export class RoleMappingRule extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'text' })
	expression: string;

	@ManyToOne('Role', 'roleMappingRules')
	@JoinColumn({ name: 'role', referencedColumnName: 'slug' })
	role: Role;

	@Column({ type: String, length: 64 })
	type: string;

	@Column({ type: 'integer', name: 'order' })
	order: number;

	@ManyToMany('Project', (project: Project) => project.roleMappingRules)
	@JoinTable({
		name: 'role_mapping_rule_project',
		joinColumn: {
			name: 'roleMappingRuleId',
			referencedColumnName: 'id',
		},
		inverseJoinColumn: {
			name: 'projectId',
			referencedColumnName: 'id',
		},
	})
	projects: Relation<Project[]>;

	@BeforeInsert()
	generateId() {
		if (!this.id) {
			this.id = randomUUID();
		}
	}
}
