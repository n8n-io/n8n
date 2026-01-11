import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { DateTimeColumn } from './abstract-entity';
import { StatisticsNames } from './types-db';
import { WorkflowEntity } from './workflow-entity';
import { bigintStringToNumber } from '../utils/transformers';

@Entity()
export class WorkflowStatistics {
	@PrimaryGeneratedColumn()
	id: number;

	// we expect values beyond JS number precision limits.
	@Column({ type: 'bigint', transformer: bigintStringToNumber })
	count: number;

	// we expect values beyond JS number precision limits.
	@Column({ type: 'bigint', transformer: bigintStringToNumber })
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
