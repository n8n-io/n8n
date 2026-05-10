import type { JSONObject } from '@n8n/agents';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

type MemoryProfileScopeKind = 'agent' | 'resource';

@Entity({ name: 'agents_memory_profiles' })
@Index(['scopeKind', 'scopeId'], { unique: true })
export class AgentMemoryProfileEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 32 })
	scopeKind: MemoryProfileScopeKind;

	@Column({ type: 'varchar', length: 255 })
	scopeId: string;

	@Column({ type: 'text' })
	content: string;

	@JsonColumn({ nullable: true })
	metadata: JSONObject | null;
}
