import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';
import { WorkflowActivateMode } from 'n8n-workflow';

import { WithCreatedAt } from './abstract-entity';

@Entity()
@Index(['workflowId', 'versionId'])
export class WorkflowPublishHistory extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar' })
	@Index()
	workflowId: string;

	@Column({ type: 'varchar', nullable: true })
	versionId: string | null;

	@Column()
	status: 'activated' | 'deactivated';

	// We only expect 'activate', 'update' and 'init' from WorkflowActivateMode
	// But this makes usage wrt typings easier.
	// If you ever see other values here this would be unexpected though
	@Column({ type: 'varchar' })
	mode: WorkflowActivateMode | 'deactivate' | null;

	@Column({ type: 'varchar', nullable: true })
	userId: string | null;
}
