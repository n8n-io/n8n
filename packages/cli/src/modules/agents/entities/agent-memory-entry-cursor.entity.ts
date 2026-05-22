import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'agents_memory_entry_cursors' })
@Index(['observationScopeId'])
export class AgentMemoryEntryCursorEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	observationScopeId: string;

	@Column({ type: 'varchar', length: 36 })
	lastIndexedObservationId: string;

	@DateTimeColumn()
	lastIndexedObservationCreatedAt: Date;
}
