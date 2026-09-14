import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	Relation,
} from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { User } from './user';
import type { WorkflowEntity } from './workflow-entity';

export type WorkflowRunAsBindingStatus = 'active' | 'revoked';

/**
 * Which n8n user a workflow's scheduled runs execute as. Only the publish flow
 * writes rows, and only for the publisher (self-consent). One active row per
 * workflow; revoked rows stay for audit.
 */
@Entity({ name: 'workflow_run_as_binding' })
@Index(['userId'])
// Mirrors the partial unique index the migration creates. Revoked rows stay for audit,
// so only the active row takes part.
@Index(['workflowId'], { unique: true, where: '"status" = \'active\'' })
export class WorkflowRunAsBinding extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@Column({ type: 'uuid' })
	userId: string;

	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: Relation<User>;

	@Column({ type: 'uuid', nullable: true })
	setBy: string | null;

	@Column({ type: 'varchar', length: 16 })
	status: WorkflowRunAsBindingStatus;
}
