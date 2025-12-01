import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToOne,
	PrimaryGeneratedColumn,
	Relation,
} from '@n8n/typeorm';

import { WithCreatedAt } from './abstract-entity';
import { User } from './user';
import type { WorkflowHistory } from './workflow-history';

@Entity()
@Index(['workflowId', 'versionId'])
export class WorkflowPublishHistory extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar' })
	workflowId: string;

	@Column({ type: 'varchar' })
	versionId: string;

	// Note that we only track "permanent" deactivations
	// We don't explicitly track the deactivations of a previous active version
	// which happens when a new active version of an already active workflow is published
	@Column()
	event: 'activated' | 'deactivated';

	@Column({ type: 'uuid', nullable: true })
	userId: string | null;

	@OneToOne('User', {
		onDelete: 'SET NULL',
		nullable: true,
	})
	@JoinColumn({ name: 'userId' })
	user: User | null;

	@ManyToOne('WorkflowHistory', 'workflowPublishHistory', { nullable: true })
	@JoinColumn({
		name: 'versionId',
	})
	workflowHistory: Relation<WorkflowHistory> | null;
}
