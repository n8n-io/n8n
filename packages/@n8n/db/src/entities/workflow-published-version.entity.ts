import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { WorkflowEntity } from './workflow-entity';
import { WorkflowHistory } from './workflow-history';

/**
 * Tracks the actually-published workflow version in production.
 * This is distinct from workflow_entity.activeVersionId which tracks
 * the requested/intended published version. Since publication is an
 * asynchronous process, this table is updated only when the new version
 * is fully deployed and ready for production executions.
 */
@Entity()
export class WorkflowPublishedVersion extends WithTimestamps {
	@PrimaryColumn({ length: 36 })
	workflowId: string;

	@Column({ length: 36 })
	publishedVersionId: string;

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
