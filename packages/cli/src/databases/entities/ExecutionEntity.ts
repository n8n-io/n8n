import { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';
import { Column, Entity, Generated, Index, OneToMany, OneToOne, PrimaryColumn } from 'typeorm';
import { datetimeColumnType } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { ExecutionData } from './ExecutionData';
import type { ExecutionMetadata } from './ExecutionMetadata';

@Entity()
@Index(['workflowId', 'id'])
@Index(['waitTill', 'id'])
@Index(['finished', 'id'])
@Index(['workflowId', 'finished', 'id'])
@Index(['workflowId', 'waitTill', 'id'])
export class ExecutionEntity {
	@Generated()
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Column()
	finished: boolean;

	@Column('varchar')
	mode: WorkflowExecuteMode;

	@Column({ nullable: true })
	retryOf: string;

	@Column({ nullable: true })
	retrySuccessId: string;

	@Column('varchar', { nullable: true })
	status: ExecutionStatus;

	@Column(datetimeColumnType)
	startedAt: Date;

	@Index()
	@Column({ type: datetimeColumnType, nullable: true })
	stoppedAt: Date;

	@Column({ nullable: true, transformer: idStringifier })
	workflowId: string;

	@Column({ type: datetimeColumnType, nullable: true })
	waitTill: Date | null;

	@OneToMany('ExecutionMetadata', 'execution')
	metadata: ExecutionMetadata[];

	@OneToOne('ExecutionData', 'execution')
	executionData: ExecutionData;
}
