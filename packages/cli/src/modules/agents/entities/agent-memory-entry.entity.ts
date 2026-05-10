import type { JSONObject } from '@n8n/agents';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity({ name: 'agents_memory_entries' })
@Index(['agentId', 'resourceId', 'contentHash'], { unique: true })
@Index(['agentId', 'resourceId', 'createdAt'])
export class AgentMemoryEntryEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'text' })
	content: string;

	@Column({ type: 'varchar', length: 64 })
	contentHash: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	sourceThreadId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	sourceMessageId: string | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	embeddingModel: string | null;

	@JsonColumn({ nullable: true })
	embedding: number[] | null;

	@JsonColumn({ nullable: true })
	metadata: JSONObject | null;
}
