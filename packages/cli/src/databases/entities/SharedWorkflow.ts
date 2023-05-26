import { Column, Entity, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import type { WorkflowEntity } from './WorkflowEntity';
import type { User } from './User';
import type { Role } from './Role';
import { AbstractEntity } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

@Entity()
export class SharedWorkflow extends AbstractEntity {
	@ManyToOne('Role', 'sharedWorkflows', { nullable: false })
	role: Relation<Role>;

	@Column()
	roleId: string;

	@ManyToOne('User', 'sharedWorkflows')
	user: Relation<User>;

	@PrimaryColumn()
	userId: string;

	@ManyToOne('WorkflowEntity', 'shared')
	workflow: Relation<WorkflowEntity>;

	@PrimaryColumn({ transformer: idStringifier })
	workflowId: string;
}
