import { JsonColumn, WithTimestamps } from '@n8n/db';
import type { McpToolPermissions } from '@n8n/api-types';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_mcp_registry_connections' })
@Index(['userId', 'serverSlug', 'credentialId'], { unique: true })
export class InstanceAiMcpRegistryConnection extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	userId: string;

	@Column({ type: 'varchar', length: 255 })
	serverSlug: string;

	@Column({ type: 'varchar', length: 36 })
	credentialId: string;

	@JsonColumn()
	toolPermissions: McpToolPermissions;
}
