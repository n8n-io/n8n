import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/**
 * A custom MCP server of a project. A delete sets `deletedAt` and keeps the slug reserved. A
 * project delete removes the server row, so its slug is free again.
 */
@Entity({ name: 'mcp_server' })
export class McpServer extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Index({ unique: true })
	@Column({ type: 'varchar', length: 128 })
	slug: string;

	@Column({ type: 'text', default: '' })
	description: string;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@DateTimeColumn({ precision: 3, nullable: true })
	deletedAt: Date | null;
}
