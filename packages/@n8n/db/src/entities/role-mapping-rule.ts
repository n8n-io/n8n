import {
	Column,
	Entity,
	Index,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	type Relation,
	Unique,
} from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Project } from './project';
import { Role } from './role';

@Entity()
@Index(['role'])
@Unique(['type', 'order'])
export class RoleMappingRule extends WithTimestampsAndStringId {
	@Column({ type: 'text' })
	expression: string;

	/** NULL means the rule blocks access instead of assigning a role. */
	@ManyToOne('Role', 'roleMappingRules', { nullable: true })
	@JoinColumn({ name: 'role', referencedColumnName: 'slug' })
	role: Role | null;

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
}
