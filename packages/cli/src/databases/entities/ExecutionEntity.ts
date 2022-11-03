import type { WorkflowExecuteMode } from 'n8n-workflow';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { datetimeColumnType, jsonColumnType } from './AbstractEntity';
import type { IExecutionFlattedDb, IWorkflowDb } from '@/Interfaces';

@Entity()
@Index(['workflowId', 'id'])
@Index(['waitTill', 'id'])
@Index(['finished', 'id'])
@Index(['workflowId', 'finished', 'id'])
@Index(['workflowId', 'waitTill', 'id'])
export class ExecutionEntity implements IExecutionFlattedDb {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('text')
	data: string;

	@Column()
	finished: boolean;

	@Column('varchar')
	mode: WorkflowExecuteMode;

	@Column({ nullable: true })
	retryOf: string;

	@Column({ nullable: true })
	retrySuccessId: string;

	@Column(datetimeColumnType)
	startedAt: Date;

	@Index()
	@Column({ type: datetimeColumnType, nullable: true })
	stoppedAt: Date;

	@Column(jsonColumnType)
	workflowData: IWorkflowDb;

	@Column({ nullable: true })
	workflowId: string;

	@Column({ type: datetimeColumnType, nullable: true })
	waitTill: Date;
}
