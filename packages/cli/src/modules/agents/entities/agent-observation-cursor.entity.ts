import { Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { ObservationCursorColumns } from './observation-cursor-columns';

@Entity({ name: 'agents_observation_cursors' })
@Index(['observationScopeId'])
export class AgentObservationCursorEntity extends ObservationCursorColumns {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	observationScopeId: string;
}
