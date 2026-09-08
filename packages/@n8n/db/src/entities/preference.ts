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

export const preferenceScopes = ['global', 'personal', 'project'] as const;

export type PreferenceScope = (typeof preferenceScopes)[number];

/**
 * Free-text instruction injected into AI prompts. A CHECK constraint ties `scope` to its target:
 * personal requires `userId`, project requires `projectId`, global requires neither.
 */
@Entity({ name: 'preference' })
export class Preference extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 16 })
	scope: PreferenceScope;

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

	@Index()
	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'createdById' })
	createdBy: Relation<User> | null;
}
