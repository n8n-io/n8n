import type { EpisodicMemoryStatus, JSONObject } from '@n8n/agents';
import { BinaryColumn, DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

import { float32VectorTransformer } from '../utils/float32-vector';

@Entity({ name: 'agents_memory_entries' })
@Index(['agentId', 'resourceId', 'status', 'createdAt', 'id'])
@Index(['agentId', 'resourceId', 'contentHash'], { unique: true })
@Index(['resourceId'])
@Index(['supersededBy'])
export class AgentMemoryEntryEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'text' })
	content: string;

	@Column({ type: 'varchar', length: 64 })
	contentHash: string;

	@Column({ type: 'varchar', length: 16 })
	status: EpisodicMemoryStatus;

	@Column({ type: 'varchar', length: 36, nullable: true })
	supersededBy: string | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	embeddingModel: string | null;

	@BinaryColumn({ nullable: true, transformer: float32VectorTransformer })
	embedding: Float32Array | null;

	@JsonColumn({ nullable: true })
	metadata: JSONObject | null;

	@DateTimeColumn()
	lastSeenAt: Date;
}
