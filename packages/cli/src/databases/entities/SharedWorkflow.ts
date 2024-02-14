import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { WorkflowEntity } from './WorkflowEntity';
import { User } from './User';
import { WithTimestamps } from './AbstractEntity';
import { Project } from './Project';

export type WorkflowSharingRole = 'workflow:owner' | 'workflow:editor' | 'workflow:user';

@Entity()
export class SharedWorkflow extends WithTimestamps {
	@Column()
	role: WorkflowSharingRole;

	@ManyToOne('User', 'sharedWorkflows')
	user: User;

	@PrimaryColumn()
	userId: string;

	@ManyToOne('WorkflowEntity', 'shared')
	workflow: WorkflowEntity;

	@PrimaryColumn()
	workflowId: string;

	@ManyToOne('Project', 'sharedWorkflows')
	project: Project;

	@Column()
	projectId: string;
}
