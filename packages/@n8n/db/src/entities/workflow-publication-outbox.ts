import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Relation,
} from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { WorkflowEntity } from './workflow-entity';
import type { WorkflowHistory } from './workflow-history';

export type WorkflowPublicationOutboxStatus =
	| 'pending'
	| 'in_progress'
	| 'completed'
	| 'partial_success'
	| 'failed';

@Entity({ name: 'workflow_publication_outbox' })
export class WorkflowPublicationOutbox extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	publishedVersionId: string;

	@Column({ type: 'varchar', length: 20, default: 'pending' })
	status: WorkflowPublicationOutboxStatus;

	@Column({ type: 'text', nullable: true })
	errorMessage: string | null;

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
