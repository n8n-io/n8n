import { Column, Entity, OneToMany } from '@n8n/typeorm';
import { WithTimestampsAndStringId } from './AbstractEntity';
import type { ProjectRelation } from './ProjectRelation';
import type { SharedCredentials } from './SharedCredentials';
import type { SharedWorkflow } from './SharedWorkflow';

export type ProjectType = 'personal' | 'team';

@Entity()
export class Project extends WithTimestampsAndStringId {
	@Column({ length: 255 })
	name: string;

	@Column({ length: 36 })
	type: ProjectType;

	@OneToMany('ProjectRelation', 'project')
	projectRelations: ProjectRelation[];

	@OneToMany('SharedCredentials', 'project')
	sharedCredentials: SharedCredentials[];

	@OneToMany('SharedWorkflow', 'project')
	sharedWorkflows: SharedWorkflow[];
}
