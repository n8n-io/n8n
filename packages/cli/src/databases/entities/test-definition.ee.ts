import { Column, Entity, Index, ManyToOne, OneToMany, RelationId } from '@n8n/typeorm';
import { Length } from 'class-validator';

import { AnnotationTagEntity } from '@/databases/entities/annotation-tag-entity.ee';
import type { TestMetric } from '@/databases/entities/test-metric.ee';
import { WorkflowEntity } from '@/databases/entities/workflow-entity';

import { jsonColumnType, WithTimestampsAndStringId } from './abstract-entity';

// Entity representing a node in a workflow under test, for which data should be mocked during test execution
export type MockedNodeItem = {
	name: string;
};

/**
 * Entity representing a Test Definition
 * It combines:
 * - the workflow under test
 * - the workflow used to evaluate the results of test execution
 * - the filter used to select test cases from previous executions of the workflow under test - annotation tag
 */
@Entity()
@Index(['workflow'])
@Index(['evaluationWorkflow'])
export class TestDefinition extends WithTimestampsAndStringId {
	@Column({ length: 255 })
	@Length(1, 255, {
		message: 'Test definition name must be $constraint1 to $constraint2 characters long.',
	})
	name: string;

	@Column('text')
	description: string;

	@Column(jsonColumnType, { default: '[]' })
	mockedNodes: MockedNodeItem[];

	/**
	 * Relation to the workflow under test
	 */
	@ManyToOne('WorkflowEntity', 'tests')
	workflow: WorkflowEntity;

	@RelationId((test: TestDefinition) => test.workflow)
	workflowId: string;

	/**
	 * Relation to the workflow used to evaluate the results of test execution
	 */
	@ManyToOne('WorkflowEntity', 'evaluationTests')
	evaluationWorkflow: WorkflowEntity;

	@RelationId((test: TestDefinition) => test.evaluationWorkflow)
	evaluationWorkflowId: string;

	/**
	 * Relation to the annotation tag associated with the test
	 * This tag will be used to select the test cases to run from previous executions
	 */
	@ManyToOne('AnnotationTagEntity', 'test')
	annotationTag: AnnotationTagEntity;

	@RelationId((test: TestDefinition) => test.annotationTag)
	annotationTagId: string;

	@OneToMany('TestMetric', 'testDefinition')
	metrics: TestMetric[];
}
