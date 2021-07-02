import {
	WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	IExecutionFlattedDb,
	IWorkflowDb,
} from '../../';

import {
	resolveDataType
} from '../utils';

import {
	Column,
	ColumnOptions,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
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

	@Column(resolveDataType('datetime'))
	startedAt: Date;

	@Index()
	@Column({ type: resolveDataType('datetime') as ColumnOptions['type'], nullable: true })
	stoppedAt: Date;

	@Column(resolveDataType('json'))
	workflowData: IWorkflowDb;

	@Index()
	@Column({ nullable: true })
	workflowId: string;
}
