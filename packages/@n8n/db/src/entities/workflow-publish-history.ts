import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { WithCreatedAt } from './abstract-entity';
import { WorkflowEntity } from './workflow-entity';

@Entity()
@Index(['workflowId', 'versionId'])
@Index(['workflowId', 'versionId', 'createdAt'], { unique: true })
export class WorkflowPublishHistory extends WithCreatedAt {
	@Column()
	workflowId: string;

	@Column()
	versionId: string;

	@Column()
	status: 'activated' | 'deactivated';

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({
		foreignKeyConstraintName: 'id',
		referencedColumnName: 'workflowId',
	})
	workflow: WorkflowEntity;
}
