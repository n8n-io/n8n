import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from './AbstractEntity';
import { User } from './User';
import { WorkflowEntity } from './WorkflowEntity';

export const enum SaveRequestStatusEnum {
	successful = 'successful',
	failed = 'failed',
}

@Entity()
export class SaveRequestLog extends AbstractEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne('User', 'saveRequestLogs')
	user: User;

	@Column()
	userId: string;

	@Column({
		type: 'jsonb',
		default: {},
	})
	request: unknown;

	@Column({
		type: 'jsonb',
		default: {},
	})
	response: unknown;

	@ManyToOne('WorkflowEntity', 'saveRequestLogs')
	workflow: WorkflowEntity;

	@Column()
	workflowId: string;

	@Column({ length: 128 })
	status: SaveRequestStatusEnum;
}
