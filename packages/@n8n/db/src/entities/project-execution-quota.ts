import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';

export type ExecutionQuotaPeriodUnit = 'day' | 'week' | 'month';

/**
 * One row per project that has an admin-configured execution quota. No row
 * for a project means it falls back to the license/tier default (see
 * `resolveDefaultProjectExecutionLimit`).
 */
@Entity({ name: 'project_execution_quota' })
export class ProjectExecutionQuota extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'int' })
	limit: number;

	@Column({ type: 'varchar', length: 10 })
	periodUnit: ExecutionQuotaPeriodUnit;
}
