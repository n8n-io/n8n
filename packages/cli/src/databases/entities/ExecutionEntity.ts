/* eslint-disable import/no-cycle */
import { WorkflowExecuteMode } from 'n8n-workflow';

import { Column, ColumnOptions, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import config = require('../../../config');
import { DatabaseType, IExecutionFlattedDb, IWorkflowDb } from '../..';

function resolveDataType(dataType: string) {
	const dbType = config.get('database.type') as DatabaseType;

	const typeMap: { [key in DatabaseType]: { [key: string]: string } } = {
		sqlite: {
			json: 'simple-json',
		},
		postgresdb: {
			datetime: 'timestamptz',
		},
		mysqldb: {},
		mariadb: {},
	};

	return typeMap[dbType][dataType] ?? dataType;
}

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

	@Column(resolveDataType('datetime'))
	startedAt: Date;

	@Index()
	@Column({ type: resolveDataType('datetime') as ColumnOptions['type'], nullable: true })
	stoppedAt: Date;

	@Column(resolveDataType('json'))
	workflowData: IWorkflowDb;

	@Column({ nullable: true })
	workflowId: string;

	@Column({ type: resolveDataType('datetime') as ColumnOptions['type'], nullable: true })
	waitTill: Date;
}
