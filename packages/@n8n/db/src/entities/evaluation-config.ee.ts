import type { DatasetRef, EvaluationConfigStatus, EvaluationMetric } from '@n8n/api-types';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Unique } from '@n8n/typeorm';

import { JsonColumn, WithTimestamps } from './abstract-entity';
import { WorkflowEntity } from './workflow-entity';

@Entity()
@Unique('UQ_evaluation_config_workflow_name', ['workflowId', 'name'])
export class EvaluationConfig extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	id: string;

	@Index()
	@Column('varchar', { length: 36 })
	workflowId: string;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: WorkflowEntity;

	@Column('varchar', { length: 128 })
	name: string;

	@Column('varchar', { length: 16, default: 'valid' })
	status: EvaluationConfigStatus;

	@Column('varchar', { length: 64, nullable: true })
	invalidReason: string | null;

	@Column('varchar', { length: 32 })
	datasetSource: DatasetRef['datasetSource'];

	@JsonColumn()
	datasetRef: DatasetRef['datasetRef'];

	@Column('varchar', { length: 255 })
	startNodeName: string;

	@Column('varchar', { length: 255 })
	endNodeName: string;

	@JsonColumn()
	metrics: EvaluationMetric[];
}
