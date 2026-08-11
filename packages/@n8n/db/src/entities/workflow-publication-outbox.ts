import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';

/**
 * `publishedVersionId` value for records enqueued to unpublish a workflow that
 * no longer has an `activeVersionId` to carry (the column is NOT NULL). Inert:
 * the applier dispatches an unpublish on the workflow's null `activeVersionId`
 * and never reads the record's version.
 */
export const UNPUBLISH_VERSION_SENTINEL = '__unpublish__';

export const WorkflowPublicationOutboxStatus = {
	Pending: 'pending',
	InProgress: 'in_progress',
	Completed: 'completed',
	PartialSuccess: 'partial_success',
	Failed: 'failed',
} as const;

export type WorkflowPublicationOutboxStatus =
	(typeof WorkflowPublicationOutboxStatus)[keyof typeof WorkflowPublicationOutboxStatus];

@Entity({ name: 'workflow_publication_outbox' })
@Index('IDX_workflow_publication_outbox_active_workflow_status', ['workflowId', 'status'], {
	unique: true,
	where: `status IN ('${WorkflowPublicationOutboxStatus.Pending}', '${WorkflowPublicationOutboxStatus.InProgress}')`,
})
export class WorkflowPublicationOutbox extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	publishedVersionId: string;

	@Column({ type: 'varchar', length: 20 })
	status: WorkflowPublicationOutboxStatus;

	@Column({ type: 'text', nullable: true })
	errorMessage: string | null;
}
