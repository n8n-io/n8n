import type { BreakingChangeVersion, MigrationFindingStatus } from '@n8n/api-types';
import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import type { WorkflowEntity } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	type Relation,
} from '@n8n/typeorm';

/**
 * One breaking-change finding: one workflow x one rule x one target version.
 * The unique index gives a finding a stable identity across scans, so triage
 * state survives a re-scan. The row is deleted together with its workflow.
 */
@Entity({ name: 'migration_finding' })
@Index(['targetVersion', 'ruleId', 'workflowId'], { unique: true })
@Index(['workflowId'])
export class MigrationFinding extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 16 })
	targetVersion: BreakingChangeVersion;

	@Column({ type: 'varchar', length: 128 })
	ruleId: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@Column({ type: 'varchar', length: 32, default: 'open' })
	status: MigrationFindingStatus;

	/** Free-text triage note set by a user. */
	@Column({ type: 'text', nullable: true })
	note: string | null;

	/** When the workflow owner was last notified. `null` when never notified. */
	@DateTimeColumn({ nullable: true })
	notifiedAt: Date | null;

	/** When `status` last changed. Set on insert. */
	@DateTimeColumn()
	statusChangedAt: Date;
}
