import { Column, Entity, Index, ManyToOne, RelationId } from '@n8n/typeorm';
import { IDataObject } from 'n8n-workflow';

import {
	datetimeColumnType,
	jsonColumnType,
	WithTimestampsAndStringId,
} from '@/databases/entities/abstract-entity';
import { TestDefinition } from '@/databases/entities/test-definition.ee';

type TestRunStatus = 'new' | 'running' | 'completed' | 'error';

/**
 * Entity representing a Test Run.
 * It stores info about a specific run of a test, combining the test definition with the status and collected metrics
 */
@Entity()
@Index(['testDefinition'])
export class TestRun extends WithTimestampsAndStringId {
	@ManyToOne('TestDefinition', 'runs')
	testDefinition: TestDefinition;

	@RelationId((testRun: TestRun) => testRun.testDefinition)
	testDefinitionId: string;

	@Column('varchar')
	status: TestRunStatus;

	@Column(datetimeColumnType)
	runAt: Date;

	@Column(datetimeColumnType)
	completedAt: Date;

	@Column(jsonColumnType, { nullable: true })
	metrics: IDataObject;
}
