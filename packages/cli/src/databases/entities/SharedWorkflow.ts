import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { WorkflowEntity } from './WorkflowEntity';
import { WithTimestamps } from './AbstractEntity';
import { Project } from './Project';

export type WorkflowSharingRole = 'workflow:owner' | 'workflow:editor';

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
