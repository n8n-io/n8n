import { WithCreatedAt, WorkflowEntity } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import type { Relation } from '@n8n/typeorm';

/** The Assistant chat that built a kept workflow. Only server code writes it. */
@Entity({ name: 'workflow_provenance' })
export class WorkflowProvenance extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	@ManyToOne(() => WorkflowEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@Column({ type: 'varchar', length: 36 })
	threadId: string;

	/** Null after the user who started the chat is deleted. */
	@Index()
	@Column({ type: 'uuid', nullable: true })
	createdByUserId: string | null;
}
