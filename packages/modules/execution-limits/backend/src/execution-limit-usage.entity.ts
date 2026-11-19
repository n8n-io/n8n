import { DateTimeColumn, type ExecutionLedgerEntityType } from '@n8n/db';
import { BaseEntity, Column, Entity, PrimaryColumn } from '@n8n/typeorm';

/** Run counts of one project, or of the instance, for one UTC day. */
@Entity('execution_limit_usage')
export class ExecutionLimitUsage extends BaseEntity {
	/** A project ID, or `EXECUTION_LIMIT_USAGE_INSTANCE_SCOPE_ID` for the instance total. */
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	/** UTC day as `YYYY-MM-DD`. */
	@PrimaryColumn({ type: 'date' })
	day: string;

	@PrimaryColumn({ type: 'varchar', length: 16 })
	entityType: ExecutionLedgerEntityType;

	@Column({ type: 'int', default: 0 })
	startedCount: number;

	/** Blocked runs do not count toward a limit. Usage is `startedCount - blockedCount`. */
	@Column({ type: 'int', default: 0 })
	blockedCount: number;

	@DateTimeColumn()
	updatedAt: Date;
}
