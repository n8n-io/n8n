import type { EpisodicMemoryStatus, JSONObject } from '@n8n/agents';
import { BinaryColumn, DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, type ValueTransformer } from '@n8n/typeorm';

const BYTES_PER_FLOAT = Float32Array.BYTES_PER_ELEMENT;

/**
 * Stores a float32 vector as its bytes. That is a fifth of the size of JSON text,
 * needs no parsing, and is the format that sqlite-vec reads. The byte order is
 * the platform's, which is little-endian on every platform n8n supports.
 */
export const float32VectorTransformer: ValueTransformer = {
	to: (vector: Float32Array | null | undefined): Buffer | null | undefined => {
		if (!vector) return vector;
		return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
	},
	from: (bytes: Buffer | null): Float32Array | null => {
		if (!bytes || bytes.length % BYTES_PER_FLOAT !== 0) return null;
		// Copy, because a Buffer can share an unaligned pool that a Float32Array cannot view.
		return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
	},
};

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
