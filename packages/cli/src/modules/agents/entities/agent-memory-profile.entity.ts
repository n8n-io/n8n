import type { JSONObject, MemoryProfileScopeKind } from '@n8n/agents';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity({ name: 'agents_memory_profiles' })
@Index(['scopeKind', 'agentId', 'resourceId'], { unique: true })
export class AgentMemoryProfileEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 32 })
	scopeKind: MemoryProfileScopeKind;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'text' })
	content: string;

	@JsonColumn({ nullable: true })
	metadata: JSONObject | null;
}
