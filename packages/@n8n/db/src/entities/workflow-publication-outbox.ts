import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';

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
@Index('IDX_workflow_publication_outbox_pending_workflow', ['workflowId'], {
	unique: true,
	where: `status = '${WorkflowPublicationOutboxStatus.Pending}'`,
})
@Index('IDX_workflow_publication_outbox_in_progress_workflow', ['workflowId'], {
	unique: true,
	where: `status = '${WorkflowPublicationOutboxStatus.InProgress}'`,
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

	/** When the record was claimed (status set to in_progress); used to detect stale in-progress records. */
	@DateTimeColumn({ nullable: true })
	claimedAt: Date | null;
}
