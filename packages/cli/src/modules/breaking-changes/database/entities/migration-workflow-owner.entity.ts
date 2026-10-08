import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import type { User, WorkflowEntity } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

/** `suggested` by the heuristic, or `assigned` by a person. Only a person changes an assignment. */
export type MigrationOwnerSource = 'suggested' | 'assigned';

/**
 * The user responsible for fixing a workflow's migration findings, one row per
 * workflow. The row goes with its workflow. A deleted user leaves `userId` null,
 * which reads as unassigned.
 */
@Entity({ name: 'migration_workflow_owner' })
@Index(['userId'])
export class MigrationWorkflowOwner extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@Column({ type: 'uuid', nullable: true })
	userId: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'userId' })
	user: Relation<User> | null;

	@Column({ type: 'varchar', length: 16 })
	source: MigrationOwnerSource;

	/** Who assigned the owner. `null` for a suggestion. */
	@Column({ type: 'uuid', nullable: true })
	assignedById: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'assignedById' })
	assignedBy: Relation<User> | null;

	/** When a person assigned the owner. `null` for a suggestion. */
	@DateTimeColumn({ nullable: true })
	assignedAt: Date | null;
}
