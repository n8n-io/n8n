import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn } from './abstract-entity';
import { StatisticsNames } from './types-db';
import { WorkflowEntity } from './workflow-entity';

@Entity()
export class WorkflowStatistics {
	@Column()
	count: number;

	@Column()
	rootCount: number;

	@DateTimeColumn()
	latestEvent: Date;

	@PrimaryColumn({ length: 128 })
	name: StatisticsNames;

	@ManyToOne('WorkflowEntity', 'shared')
	workflow: WorkflowEntity;

	@PrimaryColumn()
	workflowId: string;
}
