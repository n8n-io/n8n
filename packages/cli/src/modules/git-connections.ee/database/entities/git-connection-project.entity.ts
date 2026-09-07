import { WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { GitConnection } from './git-connection.entity';

/**
 * Links a project to a git connection. The `projectId` primary key enforces the
 * one-connection-per-project rule; a connection can hold many project links.
 *
 * The FK to `project` (with cascade delete) is declared in the migration rather
 * than as a `@ManyToOne`, to keep the module entity decoupled from the core
 * `Project` entity — mirroring the workflow-reviews pattern.
 */
@Entity('git_connection_project')
export class GitConnectionProject extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	gitConnectionId: string;

	@ManyToOne(() => GitConnection, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'gitConnectionId' })
	gitConnection: Relation<GitConnection>;
}
