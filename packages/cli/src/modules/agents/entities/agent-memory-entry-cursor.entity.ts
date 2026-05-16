import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { ObservationScopeKind } from './agent-observation.entity';

@Entity({ name: 'agents_memory_entry_cursors' })
export class AgentMemoryEntryCursorEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 20 })
	scopeKind: ObservationScopeKind;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	scopeId: string;

	@Column({ type: 'varchar', length: 36 })
	lastIndexedObservationId: string;

	@DateTimeColumn()
	lastIndexedObservationCreatedAt: Date;
}
