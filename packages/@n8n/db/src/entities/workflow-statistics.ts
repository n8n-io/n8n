import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { DateTimeColumn } from './abstract-entity';
import { StatisticsNames } from './types-db';
import { WorkflowEntity } from './workflow-entity';

@Entity()
export class WorkflowStatistics {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'bigint' })
	count: number;

	@Column({ type: 'bigint' })
	rootCount: number;

	@DateTimeColumn()
	latestEvent: Date;

	@Column({ length: 128 })
	name: StatisticsNames;

	@ManyToOne('WorkflowEntity', 'shared', { onDelete: 'SET NULL' })
	workflow: WorkflowEntity;

	@Column({ nullable: true })
	workflowId: string | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	workflowName: string | null;
}
