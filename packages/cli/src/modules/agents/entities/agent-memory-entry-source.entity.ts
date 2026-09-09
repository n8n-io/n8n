import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity({ name: 'agents_memory_entry_sources' })
@Index(['memoryEntryId', 'observationId', 'evidenceHash'], { unique: true })
@Index(['observationId'])
@Index(['agentId', 'threadId'])
@Index(['threadId'])
export class AgentMemoryEntrySourceEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 36 })
	memoryEntryId: string;

	@Column({ type: 'varchar', length: 36 })
	observationId: string;

	/** Holds an `agents_threads.id`, so it matches that column's width. */
	@Column({ type: 'varchar', length: 128 })
	threadId: string;

	@Column({ type: 'varchar', length: 64 })
	evidenceHash: string;

	@Column({ type: 'text' })
	evidenceText: string;
}
