import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { WorkflowEntity } from './workflow-entity';

/**
 * A failed publication target that automatic reconciliation retries only on
 * its backoff schedule, or never when the failure is permanent. One row per
 * workflow bounds this state independently of outbox diagnostic retention.
 */
@Entity({ name: 'workflow_publication_retry_state' })
export class WorkflowPublicationRetryState extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	/** No history foreign key: a missing history version is a suppressible failure. */
	@Column({ type: 'varchar', length: 36 })
	targetVersionId: string;

	/** The retry is due at `updatedAt` plus this delay; `null` means it is never retried. */
	@Column({ type: 'integer', nullable: true })
	retryDelaySeconds: number | null;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;
}
