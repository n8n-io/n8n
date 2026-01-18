import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { DateTimeColumn } from './abstract-entity';
import { StatisticsNames } from './types-db';
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

	// workflowId is kept as an orphaned reference when workflows are deleted
	// No FK constraint in database - allows keeping statistics for deleted workflows
	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 128, nullable: true })
	workflowName: string | null;
}
