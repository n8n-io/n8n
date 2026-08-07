import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { SourceControlConnection } from './source-control-connection.entity';

export type SourceControlScopeType = 'project' | 'instance';

/**
 * What a connection owns. `project` claims exactly one project (unique index on
 * projectId = no-overlap). `instance` is the catch-all: global entities plus every
 * unclaimed project, derived by complement — never stored per project.
 */
@Entity()
export class SourceControlScope extends WithTimestampsAndStringId {
	@ManyToOne(
		() => SourceControlConnection,
		(connection) => connection.scopes,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'connectionId' })
	connection: SourceControlConnection;

	@Column()
	connectionId: string;

	@Column({ type: 'varchar', length: 16 })
	scopeType: SourceControlScopeType;

	@Index({ unique: true })
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;
}
