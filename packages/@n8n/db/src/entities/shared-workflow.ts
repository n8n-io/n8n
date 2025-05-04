import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { Project } from './project';
import { WorkflowSharingRole } from './types-db';
import { WorkflowEntity } from './workflow-entity';

@Entity()
export class SharedWorkflow extends WithTimestamps {
	@Column()
	role: WorkflowSharingRole;

	@ManyToOne('WorkflowEntity', 'shared')
	workflow: WorkflowEntity;

	@PrimaryColumn()
	workflowId: string;

	@ManyToOne('Project', 'sharedWorkflows')
	project: Project;

	@PrimaryColumn()
	projectId: string;
}
