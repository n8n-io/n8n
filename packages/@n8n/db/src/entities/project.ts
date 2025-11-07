import { Column, Entity, OneToMany } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { CredentialsEntity } from './credentials-entity';
import type { ProjectRelation } from './project-relation';
import type { Variables } from './variables';
import type { WorkflowEntity } from './workflow-entity';

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

	@OneToMany('CredentialsEntity', 'project')
	credentials: CredentialsEntity[];

	@OneToMany('WorkflowEntity', 'project')
	workflows: WorkflowEntity[];

	@OneToMany('Variables', 'project')
	variables: Variables[];
}
