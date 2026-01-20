import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { WorkflowEntity } from './workflow-entity';
import { WorkflowHistory } from './workflow-history';

/**
 * Status of a workflow publication event in the outbox.
 */
export type WorkflowPublicationOutboxStatus =
	| 'pending'
	| 'in_progress'
	| 'completed'
	| 'partial_success'
	| 'failed';

/**
 * Outbox table for workflow publication events.
 * Uses the outbox pattern to ensure reliable asynchronous publication
 * of workflows to execution environments.
 */
@Entity()
export class WorkflowPublicationOutbox extends WithTimestamps {
	@PrimaryColumn({ length: 36 })
	id: string;

	@Column({ length: 36 })
	workflowId: string;

	@Column({ length: 36 })
	publishedVersionId: string;

	@Column()
	status: WorkflowPublicationOutboxStatus;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@ManyToOne('WorkflowHistory', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'publishedVersionId', referencedColumnName: 'versionId' })
	publishedVersion: Relation<WorkflowHistory>;
}
