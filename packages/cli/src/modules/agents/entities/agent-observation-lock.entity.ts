import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { ObservationScopeKind } from './agent-observation.entity';

export type ObservationTaskKind = 'observer' | 'reflector';

@Entity({ name: 'agents_observation_locks' })
export class AgentObservationLockEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 20 })
	scopeKind: ObservationScopeKind;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	scopeId: string;

	@PrimaryColumn({ type: 'varchar', length: 20 })
	taskKind: ObservationTaskKind;

	@Column({ type: 'varchar', length: 64 })
	holderId: string;

	@DateTimeColumn()
	heldUntil: Date;
}
