import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity({ name: 'agents_memory_entry_sources' })
@Index(['memoryEntryId', 'observationId', 'evidenceText'], { unique: true })
@Index(['observationId'])
@Index(['threadId'])
export class AgentMemoryEntrySourceEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	memoryEntryId: string;

	@Column({ type: 'varchar', length: 36 })
	observationId: string;

	@Column({ type: 'varchar', length: 255 })
	threadId: string;

	@Column({ type: 'text' })
	evidenceText: string;
}
