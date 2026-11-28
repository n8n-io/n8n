import { DateTimeColumn, dbNowLiteral, dbType } from '@n8n/db';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

// The migration has the same default. Without it on the entity, TypeORM inserts NULL on SQLite.
const DB_NOW = dbNowLiteral(dbType === 'postgresdb');

/**
 * An old URL slug of a custom MCP server. It stays reserved so no other server can take it and
 * calls to the old URL keep answering 404. A project delete deletes the server row and cascades
 * to its reserved slugs.
 */
@Entity({ name: 'mcp_server_reserved_slug' })
export class McpServerReservedSlug extends BaseEntity {
	@PrimaryColumn({ type: 'varchar', length: 128 })
	slug: string;

	@Index()
	@Column({ type: 'uuid' })
	serverId: string;

	@DateTimeColumn({ precision: 3, default: () => DB_NOW })
	reservedAt: Date;
}
