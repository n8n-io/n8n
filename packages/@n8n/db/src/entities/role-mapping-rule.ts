import {
	BeforeInsert,
	Column,
	Entity,
	Index,
	JoinTable,
	ManyToMany,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { Project } from './project';

@Entity()
@Index(['role'])
@Index(['type', 'order'])
export class RoleMappingRule {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'text' })
	expression: string;

	@Column({ type: String, length: 255 })
	role: string;

	@Column({ type: String, length: 255 })
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
