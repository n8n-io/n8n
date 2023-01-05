import { Entity, ManyToOne, PrimaryColumn, RelationId } from 'typeorm';
import type { WorkflowEntity } from './WorkflowEntity';
import type { User } from './User';
import type { Role } from './Role';
import { AbstractEntity } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

@Entity()
export class SharedWorkflow extends AbstractEntity {
	@ManyToOne('Role', 'sharedWorkflows', { nullable: false })
	role: Role;

	@ManyToOne('User', 'sharedWorkflows', { primary: true })
	user: User;

	@PrimaryColumn()
	@RelationId((sharedWorkflow: SharedWorkflow) => sharedWorkflow.user)
	userId: string;

	@ManyToOne('WorkflowEntity', 'shared', {
		primary: true,
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@PrimaryColumn({ transformer: idStringifier })
	@RelationId((sharedWorkflow: SharedWorkflow) => sharedWorkflow.workflow)
	workflowId: string;
}
