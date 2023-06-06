import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { WorkflowEntity } from './WorkflowEntity';
import { User } from './User';
import { AbstractEntity } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

@Entity()
export class SharedWorkflow extends AbstractEntity {
	@Column()
	role: string;

	@ManyToOne('User', 'sharedWorkflows')
	user: User;

	@PrimaryColumn()
	userId: string;

	@ManyToOne('WorkflowEntity', 'shared')
	workflow: WorkflowEntity;

	@PrimaryColumn({ transformer: idStringifier })
	workflowId: string;
}
