import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { datetimeColumnType } from './abstract-entity';
import { WorkflowEntity } from './workflow-entity';
import { StatisticsNames } from '../types';

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

	@PrimaryColumn()
	workflowId: string;
}
