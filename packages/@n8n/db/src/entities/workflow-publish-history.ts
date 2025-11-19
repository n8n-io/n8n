import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { WithCreatedAt } from './abstract-entity';
import { WorkflowEntity } from './workflow-entity';

@Entity()
@Index(['workflowId', 'versionId'])
// @Index(['workflowId', 'versionId', 'createdAt'], { unique: true })
export class WorkflowPublishHistory extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar' })
	@Index()
	workflowId: string;

	@Column({ type: 'varchar' })
	versionId: string | null;

	@Column()
	status: 'activated' | 'deactivated';

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({
		name: 'workflowId',
		referencedColumnName: 'id',
	})
	workflow: WorkflowEntity;
}
