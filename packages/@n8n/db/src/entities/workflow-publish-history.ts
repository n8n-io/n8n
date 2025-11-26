import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { WithCreatedAt } from './abstract-entity';
import { WorkflowPublishHistoryMode } from './types-db';
import { User } from './user';

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

	@Column({ type: 'varchar' })
	mode: WorkflowPublishHistoryMode | null;

	@Column({ type: 'varchar', nullable: true })
	userId: string | null;

	@OneToOne('User', {
		onDelete: 'SET NULL',
		nullable: true,
	})
	@JoinColumn({ name: 'userId' })
	user: User | null;
}
