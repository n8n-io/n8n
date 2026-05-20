import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { InstanceAiObservationScopeKind } from './instance-ai-observation.entity';

export type InstanceAiObservationTaskKind = 'observer' | 'reflector';

@Entity({ name: 'instance_ai_observation_locks' })
export class InstanceAiObservationLockEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 20 })
	scopeKind: InstanceAiObservationScopeKind;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	scopeId: string;

	@PrimaryColumn({ type: 'varchar', length: 20 })
	taskKind: InstanceAiObservationTaskKind;

	@Column({ type: 'varchar', length: 64 })
	holderId: string;

	@DateTimeColumn()
	heldUntil: Date;
}
