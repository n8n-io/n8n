import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Relation } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { ProjectRelation } from './project-relation';
import type { ProjectSecretsProviderAccess } from './project-secrets-provider-access';
import type { SharedCredentials } from './shared-credentials';
import type { SharedWorkflow } from './shared-workflow';
import { User } from './user';
import type { Variables } from './variables';

@Entity()
export class Project extends WithTimestampsAndStringId {
	@Column({ length: 255 })
	name: string;

	@Column({ type: 'varchar', length: 36 })
	type: 'personal' | 'team';

	@Column({ type: 'json', nullable: true })
	icon: { type: 'emoji' | 'icon'; value: string } | null;

	@Column({ type: 'varchar', length: 512, nullable: true })
	description: string | null;

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

	@Column({ type: String, nullable: true })
	creatorId: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'creatorId' })
	creator?: Relation<User>;
}
