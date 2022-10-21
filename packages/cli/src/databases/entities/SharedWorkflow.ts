import { Entity, ManyToOne, RelationId } from 'typeorm';
import { WorkflowEntity } from './WorkflowEntity';
import { User } from './User';
import { Role } from './Role';
import { AbstractEntity } from './AbstractEntity';

@Entity()
export class SharedWorkflow extends AbstractEntity {
	@ManyToOne(() => Role, (role) => role.sharedWorkflows, { nullable: false })
	role: Role;

	@ManyToOne(() => User, (user) => user.sharedWorkflows, { primary: true })
	user: User;

	@RelationId((sharedWorkflow: SharedWorkflow) => sharedWorkflow.user)
	userId: string;

	@ManyToOne(() => WorkflowEntity, (workflow) => workflow.shared, {
		primary: true,
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@RelationId((sharedWorkflow: SharedWorkflow) => sharedWorkflow.workflow)
	workflowId: number;
}
