import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { InstanceAiObservationScopeKind } from './instance-ai-observation.entity';

@Entity({ name: 'instance_ai_observation_cursors' })
export class InstanceAiObservationCursorEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 20 })
	scopeKind: InstanceAiObservationScopeKind;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	scopeId: string;

	@Column({ type: 'varchar', length: 36 })
	lastObservedMessageId: string;

	@DateTimeColumn()
	lastObservedAt: Date;
}
