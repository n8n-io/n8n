import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { WorkflowEntity } from './workflow-entity';

/**
 * A publication target that automatic reconciliation must not retry until an
 * explicit publication request clears it. One row per workflow bounds this
 * operational state independently of outbox diagnostic retention.
 */
@Entity({ name: 'workflow_publication_retry_state' })
export class WorkflowPublicationRetryState extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	/** No history foreign key: a missing history version is a suppressible failure. */
	@Column({ type: 'varchar', length: 36 })
	targetVersionId: string;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;
}
