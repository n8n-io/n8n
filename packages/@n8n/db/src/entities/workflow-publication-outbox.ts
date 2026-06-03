import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';

export type WorkflowPublicationOutboxStatus =
	| 'pending'
	| 'in_progress'
	| 'completed'
	| 'partial_success'
	| 'failed';

@Entity({ name: 'workflow_publication_outbox' })
@Index('IDX_workflow_publication_outbox_pending_workflow', ['workflowId'], {
	unique: true,
	where: "status = 'pending'",
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
