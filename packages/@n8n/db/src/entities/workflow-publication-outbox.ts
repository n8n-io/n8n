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

/**
 * Why a publication record was enqueued. The applier translates it into the
 * `WorkflowActivateMode` reported to trigger nodes, so e.g. the n8n Trigger's
 * "Instance Started" event fires only for the leader's startup pass.
 */
export const WorkflowPublicationReason = {
	/** A user published or unpublished the workflow. */
	Publish: 'publish',
	/** The leader's initial pass after the process booted. */
	Startup: 'startup',
	/** A running instance became leader without restarting. */
	LeadershipTakeover: 'leadership-takeover',
	/** A periodic reconciliation pass healing detected drift. */
	Reconcile: 'reconcile',
} as const;

export type WorkflowPublicationReason =
	(typeof WorkflowPublicationReason)[keyof typeof WorkflowPublicationReason];

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

	@Column({ type: 'varchar', length: 20, default: 'publish' })
	reason: WorkflowPublicationReason;

	@Column({ type: 'text', nullable: true })
	errorMessage: string | null;
}
