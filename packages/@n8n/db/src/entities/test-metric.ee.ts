import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';
import { Length } from 'class-validator';

import { WithTimestampsAndStringId } from './abstract-entity';
import { TestDefinition } from './test-definition.ee';

/**
 * Entity representing a Test Metric
 * It represents a single metric that can be retrieved from evaluation workflow execution result
 */
@Entity()
@Index(['testDefinition'])
export class TestMetric extends WithTimestampsAndStringId {
	/**
	 * Name of the metric.
	 * This will be used as a property name to extract metric value from the evaluation workflow execution result object
	 */
	@Column({ length: 255 })
	@Length(1, 255, {
		message: 'Metric name must be $constraint1 to $constraint2 characters long.',
	})
	name: string;

	/**
	 * Relation to test definition
	 */
	@ManyToOne('TestDefinition', 'metrics')
	testDefinition: TestDefinition;
}
