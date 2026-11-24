import { DateTimeColumn } from '@n8n/db';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** One AI client of one person on one server. */
@Entity({ name: 'mcp_server_connection' })
export class McpServerConnection extends BaseEntity {
	@PrimaryColumn('uuid')
	serverId: string;

	@Index()
	@PrimaryColumn('uuid')
	userId: string;

	@Index()
	@PrimaryColumn({ type: 'varchar' })
	oauthClientId: string;

	@Column({ type: 'varchar', length: 255 })
	clientName: string;

	@DateTimeColumn({ precision: 3 })
	firstUsedAt: Date;

	@DateTimeColumn({ precision: 3 })
	lastUsedAt: Date;
}
