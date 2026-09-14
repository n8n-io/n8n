import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	Relation,
} from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { Project } from './project';
import type { User } from './user';

/**
 * Free-text instruction injected into AI prompts. `userId` set: personal to one user.
 * `projectId` set: shared by one project. Neither: global. A CHECK forbids both.
 */
@Entity({ name: 'ai_preference' })
export class AiPreference extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'text' })
	content: string;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	userId: string | null;

	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: Relation<User> | null;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@ManyToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project> | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'createdById' })
	createdBy: Relation<User> | null;
}
