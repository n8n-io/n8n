import { DateTimeColumn, dbNowLiteral, dbType } from '@n8n/db';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

// The migration has the same default. Without it on the entity, TypeORM inserts NULL on SQLite.
const DB_NOW = dbNowLiteral(dbType === 'postgresdb');

/** A person who cannot connect to a server. The block applies to all clients of the person. */
@Entity({ name: 'mcp_server_block' })
export class McpServerBlock extends BaseEntity {
	@PrimaryColumn('uuid')
	serverId: string;

	@Index()
	@PrimaryColumn('uuid')
	userId: string;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	blockedById: string | null;

	@DateTimeColumn({ precision: 3, default: () => DB_NOW })
	blockedAt: Date;
}
