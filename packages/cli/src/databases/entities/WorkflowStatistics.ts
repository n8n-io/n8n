import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { idStringifier } from '../utils/transformers';
import { datetimeColumnType } from './AbstractEntity';
import type { WorkflowEntity } from './WorkflowEntity';

export enum StatisticsNames {
	productionSuccess = 'production_success',
	productionError = 'production_error',
	manualSuccess = 'manual_success',
	manualError = 'manual_error',
	dataLoaded = 'data_loaded',
}

@Entity()
export class WorkflowStatistics {
	@Column()
	count: number;

	@Column(datetimeColumnType)
	latestEvent: Date;

	@PrimaryColumn({ length: 128 })
	name: StatisticsNames;

	@ManyToOne('WorkflowEntity', 'shared')
	workflow: WorkflowEntity;

	@PrimaryColumn({ transformer: idStringifier })
	workflowId: string;
}
