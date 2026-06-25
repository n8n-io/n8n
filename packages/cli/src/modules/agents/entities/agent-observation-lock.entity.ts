import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

export type ObservationTaskKind = 'observer' | 'reflector';

@Entity({ name: 'agents_observation_locks' })
@Index(['observationScopeId'])
export class AgentObservationLockEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	observationScopeId: string;

	@PrimaryColumn({ type: 'varchar', length: 20 })
	taskKind: ObservationTaskKind;

	@Column({ type: 'varchar', length: 64 })
	holderId: string;

	@DateTimeColumn()
	heldUntil: Date;
}
