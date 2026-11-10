import type { ObservationLogTaskKind } from '@n8n/agents';
import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { AGENT_THREAD_ID_MAX_LENGTH } from '../integrations/types';

@Entity({ name: 'agents_observation_locks' })
@Index(['observationScopeId'])
export class AgentObservationLockEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@PrimaryColumn({ type: 'varchar', length: AGENT_THREAD_ID_MAX_LENGTH })
	observationScopeId: string;

	@PrimaryColumn({ type: 'varchar', length: 20 })
	taskKind: ObservationLogTaskKind;

	@Column({ type: 'varchar', length: 64 })
	holderId: string;

	@DateTimeColumn()
	heldUntil: Date;
}
