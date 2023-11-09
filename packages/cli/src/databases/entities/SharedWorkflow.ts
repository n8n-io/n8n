import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { WorkflowEntity } from './WorkflowEntity';
import { User } from './User';
import { Role } from './Role';
import { WithTimestamps } from './AbstractEntity';

@Entity()
export class SharedWorkflow extends WithTimestamps {
	@ManyToOne('Role', 'sharedWorkflows', { nullable: false })
	role: Role;

	@Column()
	roleId: string;

	@ManyToOne('User', 'sharedWorkflows')
	user: User;

	@PrimaryColumn()
	userId: string;

	@ManyToOne('WorkflowEntity', 'shared')
	workflow: WorkflowEntity;

	@PrimaryColumn()
	workflowId: string;
}
