import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'agents_observation_cursors' })
export class AgentObservationCursorEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	observationScopeId: string;

	@Column({ type: 'varchar', length: 36 })
	lastObservedMessageId: string;

	@DateTimeColumn()
	lastObservedAt: Date;
}
