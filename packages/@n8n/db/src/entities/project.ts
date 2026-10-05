import {
	Column,
	Entity,
	JoinColumn,
	ManyToMany,
	ManyToOne,
	OneToMany,
	Relation,
} from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { ProjectRelation } from './project-relation';
import type { ProjectSecretsProviderAccess } from './project-secrets-provider-access';
import type { RoleMappingRule } from './role-mapping-rule';
import type { SharedCredentials } from './shared-credentials';
import type { SharedWorkflow } from './shared-workflow';
import { User } from './user';
import type { Variables } from './variables';

@Entity()
export class Project extends WithTimestampsAndStringId {
	@Column({ length: 255 })
	name: string;

	/**
	 * PROTOTYPE (workspaces): `workspace`, `personalWorkspace` and `instance` rows
	 * hold resources for their child projects but never hold workflows.
	 */
	@Column({ type: 'varchar', length: 36 })
	type: 'personal' | 'team' | 'workspace' | 'personalWorkspace' | 'instance';

	/** The workspace that contains this project. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	parentId: string | null;

	@ManyToOne('Project', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'parentId' })
	parent?: Relation<Project> | null;

	/** PROTOTYPE (workspaces): anyone on the instance can join this workspace without approval. */
	@Column({ default: true })
	isPublic: boolean;

	/** PROTOTYPE (workspaces): workspace members get the same role on every project in it. */
	@Column({ default: false })
	cascadeMembers: boolean;

	@Column({ type: 'json', nullable: true })
	icon: { type: 'emoji' | 'icon'; value: string } | null;

	@Column({ type: 'varchar', length: 512, nullable: true })
	description: string | null;

	@Column({ type: 'json', nullable: false, default: '[]' })
	customTelemetryTags: Array<{ key: string; value: string }>;

	@OneToMany('ProjectRelation', 'project')
	projectRelations: ProjectRelation[];

	@OneToMany('SharedCredentials', 'project')
	sharedCredentials: SharedCredentials[];

	@OneToMany('SharedWorkflow', 'project')
	sharedWorkflows: SharedWorkflow[];

	@OneToMany('ProjectSecretsProviderAccess', 'project')
	secretsProviderAccess: ProjectSecretsProviderAccess[];

	@OneToMany('Variables', 'project')
	variables: Variables[];

	@ManyToMany('RoleMappingRule', (rule: RoleMappingRule) => rule.projects)
	roleMappingRules: RoleMappingRule[];

	@Column({ type: String, nullable: true })
	creatorId: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'creatorId' })
	creator?: Relation<User>;
}

/**
 * PROTOTYPE (workspaces): code that predates workspaces only knows personal
 * and team projects. Treat every non-personal type as a team project there.
 */
export function asLegacyProjectType(type: Project['type']): 'personal' | 'team' {
	return type === 'personal' ? 'personal' : 'team';
}
