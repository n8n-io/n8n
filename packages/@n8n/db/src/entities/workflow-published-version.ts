import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { WorkflowEntity } from './workflow-entity';
import type { WorkflowHistory } from './workflow-history';

@Entity({ name: 'workflow_published_version' })
export class WorkflowPublishedVersion extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	publishedVersionId: string;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'RESTRICT',
	})
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@ManyToOne('WorkflowHistory', {
		onDelete: 'RESTRICT',
	})
	@JoinColumn({ name: 'publishedVersionId', referencedColumnName: 'versionId' })
	publishedVersion: Relation<WorkflowHistory>;
}
