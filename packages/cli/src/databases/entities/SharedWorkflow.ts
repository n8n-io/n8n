import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { WorkflowEntity } from './WorkflowEntity';
import { User } from './User';
import { Role } from './Role';
import { AbstractEntity } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

@Entity()
export class SharedWorkflow extends AbstractEntity {
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

	@PrimaryColumn({ transformer: idStringifier })
	workflowId: string;
}
