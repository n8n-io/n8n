import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { ExecutionQuotaPeriodUnit } from './project-execution-quota';

/**
 * Live, fast-incrementing count of executions per (project, workflow, period
 * bucket). Project quota checks sum across a project's workflows for the
 * current bucket; the same rows back the spike-guard's per-workflow daily
 * counts. `periodStart` is a canonical bucket key (e.g. '2026-09-01' for a
 * day, not a timestamp) so equality comparisons are exact and DB-portable.
 */
@Entity({ name: 'project_execution_counter' })
export class ProjectExecutionCounter extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 10 })
	periodUnit: ExecutionQuotaPeriodUnit;

	@Column({ type: 'varchar', length: 32 })
	periodStart: string;

	@Column({ type: 'int', default: 0 })
	count: number;
}
