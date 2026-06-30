import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { WorkflowEntity } from './workflow-entity';
import type { WorkflowHistory } from './workflow-history';

export type WorkflowPublicationTriggerStatusType = 'activated' | 'failed';

/**
 * Per-trigger outcome of the most recent version-advancing publication for a
 * workflow. Full-replaced on each completed/partial/failed publication; the
 * row composition is the source of truth for the published/partial/failed
 * headline surfaced to the UI.
 */
@Entity({ name: 'workflow_publication_trigger_status' })
export class WorkflowPublicationTriggerStatus extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	nodeId: string;

	/** The `workflow_history` version these statuses were recorded for. */
	@Column({ type: 'varchar', length: 36 })
	versionId: string;

	@Column({ type: 'varchar', length: 20 })
	status: WorkflowPublicationTriggerStatusType;

	@Column({ type: 'text', nullable: true })
	errorMessage: string | null;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@ManyToOne('WorkflowHistory', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'versionId', referencedColumnName: 'versionId' })
	publishedVersion: Relation<WorkflowHistory>;
}
