import { Column, Entity, RelationId, ManyToOne, PrimaryColumn } from 'typeorm';
import { datetimeColumnType } from './AbstractEntity';
import { WorkflowEntity } from './WorkflowEntity';

export enum StatisticsNames {
	productionSuccess = 'production_success',
	productionError = 'production_error',
	manualSuccess = 'manual_success',
	manualError = 'manual_error',
}

@Entity()
export class WorkflowStatistics {
	@Column()
	count: number;

	@Column(datetimeColumnType)
	latestEvent: Date;

	@PrimaryColumn({ length: 128 })
	name: StatisticsNames;

	@ManyToOne(() => WorkflowEntity, (workflow) => workflow.shared, {
		primary: true,
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@RelationId((workflowStatistics: WorkflowStatistics) => workflowStatistics.workflow)
	@PrimaryColumn()
	workflowId: number;
}
