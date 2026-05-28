import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_mcp_registry_connections' })
@Index(['userId', 'credentialId'], { unique: true })
export class InstanceAiMcpRegistryConnection extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	userId: string;

	@Column({ type: 'varchar', length: 255 })
	serverSlug: string;

	@Column({ type: 'varchar', length: 16 })
	credentialId: string;
}
