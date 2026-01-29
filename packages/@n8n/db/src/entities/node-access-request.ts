import { Column, Entity, Index, ManyToOne, JoinColumn, Relation } from '@n8n/typeorm';

import { WithTimestampsAndStringId, DateTimeColumn } from './abstract-entity';
import { Project } from './project';
import { User } from './user';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

@Entity()
@Index(['projectId', 'status'])
@Index(['requestedById', 'status'])
export class NodeAccessRequest extends WithTimestampsAndStringId {
	@Column({ type: String })
	projectId: string;

	@ManyToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	@Column({ type: String })
	requestedById: string;

	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'requestedById' })
	requestedBy: Relation<User>;

	@Column({ type: 'varchar', length: 255 })
	nodeType: string;

	@Column({ type: 'text' })
	justification: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	workflowName: string | null;

	@Column({ type: 'varchar', length: 10, default: 'pending' })
	status: RequestStatus;

	@Column({ type: String, nullable: true })
	reviewedById: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'reviewedById' })
	reviewedBy?: Relation<User>;

	@Column({ type: 'text', nullable: true })
	reviewComment: string | null;

	@DateTimeColumn({ nullable: true })
	reviewedAt: Date | null;
}
